// file: tests/core/city-resolver.test.ts
/**
 * Shared city matcher tests — the strategy both Aymakan and SMSA enforce at
 * booking time (see src/core/city-resolver.ts).
 */

import { describe, expect, test } from "bun:test";
import {
  findCityMatch,
  normalizeArabicCity,
} from "../../src/core/city-resolver";
import type { City } from "../../src/core/types";

const CITIES: City[] = [
  { nameEn: "Riyadh", nameAr: "الرياض" },
  { nameEn: "Jeddah", nameAr: "جدة" },
  { nameEn: "Khobar City", nameAr: "الخبر" },
  // English-only entry, like every city in SMSA's lookup (no nameAr).
  { nameEn: "Dammam", code: "DMM" },
];

describe("normalizeArabicCity", () => {
  test("strips tashkeel and unifies alef / taa marbuta variants", () => {
    expect(normalizeArabicCity("الرِيَاض")).toBe("الرياض");
    expect(normalizeArabicCity("أبها")).toBe(normalizeArabicCity("ابها"));
    expect(normalizeArabicCity("جدة")).toBe(normalizeArabicCity("جده"));
  });

  test("does not strip Arabic-Indic digits", () => {
    expect(normalizeArabicCity("حي ٢٩")).toBe("حي ٢٩");
  });
});

describe("findCityMatch", () => {
  test("matches English names case-insensitively", () => {
    expect(findCityMatch("riyadh", CITIES)?.nameEn).toBe("Riyadh");
    expect(findCityMatch("  JEDDAH ", CITIES)?.nameEn).toBe("Jeddah");
  });

  test("matches exact and normalized Arabic names", () => {
    expect(findCityMatch("الرياض", CITIES)?.nameEn).toBe("Riyadh");
    expect(findCityMatch("الرِيَاض", CITIES)?.nameEn).toBe("Riyadh");
    expect(findCityMatch("جده", CITIES)?.nameEn).toBe("Jeddah");
  });

  test('matches Arabic input with the "ال" prefix toggled', () => {
    expect(findCityMatch("رياض", CITIES)?.nameEn).toBe("Riyadh");
    expect(findCityMatch("خبر", CITIES)?.nameEn).toBe("Khobar City");
  });

  test("resolves a short English input to the candidate that contains it", () => {
    expect(findCityMatch("Khobar", CITIES)?.nameEn).toBe("Khobar City");
  });

  test("never reroutes a longer distinct input to a shorter candidate", () => {
    expect(findCityMatch("Riyadh Al Khabra", CITIES)).toBeNull();
  });

  test("returns null when the input is a substring of several distinct cities", () => {
    const ambiguous: City[] = [
      { nameEn: "Dhahran Al Janub", nameAr: "ظهران الجنوب" },
      { nameEn: "Dhahran Heights", nameAr: "مرتفعات الظهران" },
    ];
    // "Dhahran" is contained by both and equals neither — resolving it would be
    // a list-order guess, so the matcher rejects rather than reroute silently.
    expect(findCityMatch("Dhahran", ambiguous)).toBeNull();
  });

  test("requires at least 3 chars for the contains match", () => {
    expect(findCityMatch("Kh", CITIES)).toBeNull();
  });

  test("works against English-only lists (no nameAr, like SMSA's)", () => {
    expect(findCityMatch("dammam", CITIES)?.code).toBe("DMM");
    // Arabic input cannot resolve against an English-only entry.
    expect(findCityMatch("الدمام", CITIES)).toBeNull();
  });

  test("returns null for empty input or empty list", () => {
    expect(findCityMatch("   ", CITIES)).toBeNull();
    expect(findCityMatch("Riyadh", [])).toBeNull();
  });
});
