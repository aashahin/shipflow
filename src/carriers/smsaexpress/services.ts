// file: src/carriers/smsaexpress/services.ts
/**
 * SMSA Express Service Type Codes
 * Use these constants for type-safe service selection.
 */

export const SMSAService = {
  /** E-commerce delivery */
  ECOMMERCE_DELIVERY: "EDDL",
  /** Express delivery */
  EXPRESS_DELIVERY: "EDEL",
  /** C2B / Reverse pickup */
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
