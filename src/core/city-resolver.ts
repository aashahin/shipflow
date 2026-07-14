// file: src/core/city-resolver.ts
/**
 * Shared city matching for carrier adapters that validate the shipper /
 * consignee city against the carrier's own city list before booking.
 *
 * Extracted verbatim from the Aymakan adapter's proven matching strategy so
 * SMSA (and future carriers) enforce identical semantics. The strategy never
 * silently reroutes a distinct longer city to a shorter candidate (see the
 * step-5 direction guard).
 */

import type { City } from "./types";

/** How long a fetched carrier city list stays fresh (1 hour). */
export const CITIES_CACHE_TTL = 60 * 60 * 1000;

/**
 * After a failed city-list fetch, don't retry for this long (1 minute) —
 * adapters fall back to pass-through resolution so a carrier /cities outage
 * never hard-blocks shipment creation.
 */
export const CITIES_FAILURE_COOLDOWN = 60 * 1000;

/**
 * Normalize Arabic text for comparison:
 * - Strip diacritics (tashkeel)
 * - Normalize alef variants (أ إ آ → ا)
 * - Normalize taa marbuta (ة → ه)
 * - Trim whitespace
 */
export function normalizeArabicCity(text: string): string {
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "") // strip tashkeel
    .replace(/[أإآ]/g, "ا") // normalize alef
    .replace(/ة/g, "ه"); // normalize taa marbuta
}

/**
 * Match a user-input city name against a carrier city list.
 *
 * Matching strategy (first match wins):
 * 1. Exact match on English name (case-insensitive)
 * 2. Exact match on Arabic name
 * 3. Normalized Arabic match (handles tashkeel, alef variants, taa marbuta)
 * 4. Match after toggling the "ال" prefix on the Arabic input
 * 5. Candidate-contains-input match on English name (candidate name contains
 *    the input, e.g. "Riyadh" -> "Riyadh City"; requires input length >= 3).
 *    The reverse direction is intentionally excluded so a distinct longer
 *    city like "Riyadh Al Khabra" is never rerouted to "Riyadh".
 *
 * Returns null when nothing matches — the caller decides whether that means
 * pass-through (lenient) or a validation error (strict).
 */
export function findCityMatch(inputCity: string, cities: City[]): City | null {
  const trimmed = inputCity.trim();
  if (!trimmed || cities.length === 0) return null;
  const lower = trimmed.toLowerCase();

  // 1. Exact English match (case-insensitive)
  const exactEn = cities.find((c) => c.nameEn.toLowerCase() === lower);
  if (exactEn) return exactEn;

  // 2. Exact Arabic match
  const exactAr = cities.find((c) => c.nameAr === trimmed);
  if (exactAr) return exactAr;

  // 3. Normalized Arabic match
  const normalizedInput = normalizeArabicCity(trimmed);
  const normalizedAr = cities.find(
    (c) => c.nameAr && normalizeArabicCity(c.nameAr) === normalizedInput,
  );
  if (normalizedAr) return normalizedAr;

  // 4. Arabic with the "ال" prefix toggled
  const withoutAl = normalizedInput.startsWith("ال")
    ? normalizedInput.slice(2)
    : `ال${normalizedInput}`;
  const alMatch = cities.find(
    (c) => c.nameAr && normalizeArabicCity(c.nameAr) === withoutAl,
  );
  if (alMatch) return alMatch;

  // 5. Candidate-contains-input match on English name (e.g. input "Riyadh"
  //    resolves to the canonical "Riyadh City"). We deliberately match ONLY
  //    this direction. The reverse direction (input contains a candidate's
  //    name) is excluded because a longer, distinct city such as
  //    "Riyadh Al Khabra" would otherwise be silently rerouted to "Riyadh".
  //    Guarded by a minimum input length so very short inputs (1-2 chars)
  //    don't spuriously substring-match many candidates. Requires a UNIQUE
  //    containing candidate: if the input is a substring of several distinct
  //    cities (e.g. "Dhahran" ⊂ both "Dhahran" and "Dhahran Al Janub"), the
  //    match is ambiguous and we return null rather than silently pick the
  //    first by list order — the caller then rejects (strict) or passes the
  //    original through (lenient).
  if (lower.length >= 3) {
    const containing = cities.filter((c) =>
      c.nameEn.toLowerCase().includes(lower),
    );
    const [only] = containing;
    if (only && containing.length === 1) return only;
  }

  return null;
}
