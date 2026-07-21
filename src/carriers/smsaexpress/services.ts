// file: src/carriers/smsaexpress/services.ts
/**
 * SMSA Express Service Type Codes (sample / common values).
 *
 * Official B2C docs mark `ServiceCode` as **optional** and say codes come from
 * the Service Types lookup (`GET /api/Lookup/ServiceTypes`). Codes are
 * **account-contract specific** — the sample EDDL is not valid on every key.
 *
 * Recommendation:
 * - B2C create: omit `serviceType` so ServiceCode is not sent (account default).
 * - C2B reverse pickup: use {@link SMSAService.C2B_REVERSE} (`EDCR`).
 * - Explicit product: call `adapter.getServiceTypes()` and pick a code from the
 *   list your API key returns.
 */

export const SMSAService = {
  /**
   * Sample e-commerce delivery code from SMSA docs.
   * @deprecated Prefer omitting serviceType on B2C, or use a code from
   * `getServiceTypes()` for your account — EDDL is frequently rejected.
   */
  ECOMMERCE_DELIVERY: "EDDL",
  /**
   * Sample express delivery code.
   * @deprecated Prefer a code from `getServiceTypes()` for your account.
   */
  EXPRESS_DELIVERY: "EDEL",
  /** C2B / Reverse pickup (routes to `/api/c2b/new`) */
  C2B_REVERSE: "EDCR",
} as const;

export type SMSAServiceType = (typeof SMSAService)[keyof typeof SMSAService];

/**
 * SMSA Express Scan Type Codes → Unified ShipmentStatus mapping.
 *
 * Based on /api/track/statuslookup response.
 * Scan types not explicitly listed default to "unknown" (see mapSMSAStatus)
 * so operators can detect unmapped codes instead of silently treating them
 * as in-transit.
 */
export const SMSAStatusCodes: Record<string, string> = {
  // Delivery
  DL: "delivered",

  // Out for delivery
  OD: "out_for_delivery",

  // Arrived at facility
  AF: "at_warehouse",

  // Hub / sorting
  HOP: "in_transit",
  HOR: "in_transit",
  HOT: "in_transit",

  // Picked up / collected
  PU: "picked_up",
  PKD: "picked_up",

  // Customs
  CR: "in_transit",
  CH: "in_transit",

  // Exceptions
  DE: "exception",
  DMG: "exception",
  MISS: "exception",

  // Cancelled / returned
  CAN: "cancelled",
  RTO: "returned",
  RTN: "returned",

  // Processing
  CC: "at_warehouse",
  PP: "pending",

  // Created / booked
  BK: "created",
  NEW: "created",
};
