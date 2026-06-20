// file: src/carriers/aramex/services.ts
/**
 * Aramex Service / Product Codes
 * Use these constants for type-safe product and payment selection.
 *
 * Reference: Aramex Shipping Services API manual, Appendix A (Product Types)
 * and Appendix B (Payment Types).
 */

/** Shipment product group: domestic vs international/express. */
export const AramexProductGroup = {
  EXPRESS: "EXP",
  DOMESTIC: "DOM",
} as const;

/** Product type codes (Appendix A). `OND` is the only domestic type. */
export const AramexProductType = {
  /** Domestic (DOM group) */
  DOMESTIC: "OND",
  /** Priority Document Express */
  PRIORITY_DOCUMENT_EXPRESS: "PDX",
  /** Priority Parcel Express */
  PRIORITY_PARCEL_EXPRESS: "PPX",
  /** Priority Letter Express */
  PRIORITY_LETTER_EXPRESS: "PLX",
  /** Deferred Document Express */
  DEFERRED_DOCUMENT_EXPRESS: "DDX",
  /** Deferred Parcel Express */
  DEFERRED_PARCEL_EXPRESS: "DPX",
  /** Ground Document Express */
  GROUND_DOCUMENT_EXPRESS: "GDX",
  /** Ground Parcel Express */
  GROUND_PARCEL_EXPRESS: "GPX",
  /** Economy Parcel Express */
  ECONOMY_PARCEL_EXPRESS: "EPX",
  /** Return */
  RETURN: "RTN",
} as const;

/** Payment type codes (Appendix B). */
export const AramexPaymentType = {
  PREPAID: "P",
  COLLECT: "C",
  THIRD_PARTY: "3",
} as const;

/**
 * Special service codes joined (comma-separated) into `Details.Services`.
 * e.g. `"CODS"` enables Cash-On-Delivery handling.
 */
export const AramexService = {
  COD: "CODS",
  INSURANCE: "INSR",
} as const;

export type AramexProductGroupType =
  (typeof AramexProductGroup)[keyof typeof AramexProductGroup];
export type AramexProductTypeCode =
  (typeof AramexProductType)[keyof typeof AramexProductType];
export type AramexPaymentTypeCode =
  (typeof AramexPaymentType)[keyof typeof AramexPaymentType];

/**
 * Aramex Tracking Status Codes (`UpdateCode`) → unified ShipmentStatus.
 *
 * IMPORTANT: Aramex does not publish a stable, comprehensive `UpdateCode` list,
 * and the codes vary by region/account. This table is a best-effort starter —
 * entries marked `VERIFY` should be confirmed against live tracking data. The
 * mapper falls back to a description-keyword heuristic and then `"unknown"`, so
 * an unmapped code never breaks tracking.
 */
export const AramexStatusCodes = {
  "SH001": "created", // Shipment information received       (VERIFY)
  "SH002": "picked_up", // Picked up from shipper            (VERIFY)
  "SH004": "at_warehouse", // Received at origin facility     (VERIFY)
  "SH005": "out_for_delivery", // Out on delivery courier
  "SH014": "delivered", // Shipment delivered                (VERIFY)
  "SH060": "in_transit", // Departed / in transit            (VERIFY)
  "SH074": "exception", // Delivery attempt failed           (VERIFY)
  "SH159": "exception", // Held / customs / address problem  (VERIFY)
  "SH212": "returned", // Returned to shipper                (VERIFY)
  "SH235": "delivered", // Delivered                         (VERIFY)
} as const;
