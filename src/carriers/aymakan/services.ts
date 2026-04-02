// file: src/carriers/aymakan/services.ts
/**
 * Aymakan Service Type Codes
 * Use these constants for type-safe service selection.
 */

export const AymakanService = {
  /** Default ecommerce service */
  ECOMMERCE: "ONP",
  /** Documents or banking docs service */
  DOCUMENTS: "DOC",
  /** Same day delivery service */
  SAME_DAY: "SDD",
  /** Reverse pickup service */
  REVERSE_PICKUP: "RVP",
  /** Exchange service */
  EXCHANGE: "EXH",
  /** Lockers service */
  LOCKERS: "LOC",
  /** Heavy and bulky service */
  HEAVY: "BLK",
  /** Pallet service */
  PALLET: "PLT",
  /** Import express (International) */
  IMPORT_EXPRESS: "IPX",
  /** Export express (International) */
  EXPORT_EXPRESS: "EPX",
} as const;

export type AymakanServiceType =
  (typeof AymakanService)[keyof typeof AymakanService];

/**
 * Aymakan Status Codes
 * Maps carrier-specific codes to our unified status.
 */
export const AymakanStatusCodes = {
  // Core lifecycle
  "AY-0001": "created", // Shipment created / AWB created at origin
  "AY-0002": "picked_up", // Collected from collection point
  "AY-0003": "at_warehouse", // Received at hub
  "AY-0004": "out_for_delivery", // Out for final destination
  "AY-0005": "delivered", // Delivered to customer
  "AY-0006": "exception", // Not delivered (failed attempt)

  // Warehouse / transfer
  "AY-0026": "at_warehouse", // Received at [City] Warehouse
  "AY-0027": "in_transit", // Transferred to destination city
  "AY-0028": "in_transit", // In transit between hubs

  // Pending / rescheduled (delivery was attempted but rescheduled)
  "AY-0032": "pending", // Pending — future delivery / rescheduled

  // Terminal states
  "AY-0007": "returned", // Returned to shipper
  "AY-0008": "cancelled", // Cancelled
  "AY-0009": "returned", // Return to origin
} as const;
