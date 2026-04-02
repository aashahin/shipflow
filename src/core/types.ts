// file: src/core/types.ts
/**
 * Unified types for ShipFlow SDK
 * These are the normalized types that all carrier adapters map to/from
 */

// ============================================================================
// ADDRESSES
// ============================================================================

/** Saudi National Address structure (SPL format) */
export interface NationalAddress {
  shortCode: string;
  buildingNumber?: string;
  streetName?: string;
  district?: string;
  additionalNumber?: string;
}

/** Unified address structure */
export interface Address {
  name: string;
  company?: string;
  email?: string;
  phone: string;
  line1: string;
  line2?: string;
  neighbourhood?: string;
  city: string;
  state?: string; // Province/region code
  postalCode?: string;
  countryCode: string; // ISO 3166-1 alpha-2
  coordinates?: { latitude: number; longitude: number };
  description?: string;
  nationalAddress?: NationalAddress;
}

/** Customer address (stored in carrier system) */
export interface CustomerAddress {
  id?: number;
  title: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  neighbourhood: string;
  postalCode?: string;
  countryCode?: string;
  description?: string;
}

// ============================================================================
// PARCELS & SHIPMENTS
// ============================================================================

export interface Weight {
  value: number;
  unit: "kg" | "lb";
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "in";
}

export interface Parcel {
  weight: Weight;
  dimensions?: Dimensions;
  pieces: number;
  itemsCount?: number;
  description?: string;
}

/** Cash on Delivery configuration */
export interface CODDetails {
  enabled: boolean;
  amount: number;
  currency: string;
}

/** Declared value for customs/insurance */
export interface DeclaredValue {
  amount: number;
  currency: string;
}

/** International shipment metadata */
export interface InternationalMetadata {
  taxId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  documentId?: number;
}

/** Carrier-specific options */
export interface ShipmentOptions {
  requestedBy?: string;
  isInsured?: boolean;
  customerTracking?: string;
  fulfilmentCustomerName?: string;
  internationalMetadata?: InternationalMetadata;
  /** Carrier-specific passthrough */
  metadata?: Record<string, unknown>;
}

/** Input for creating a shipment */
export interface CreateShipmentInput {
  shipper: Address;
  consignee: Address;
  parcels: Parcel[];
  serviceType: string;
  reference?: string;
  cod?: CODDetails;
  declaredValue?: DeclaredValue;
  labelFormat?: "PDF" | "ZPL" | "PNG";
  options?: ShipmentOptions;
}

/** Normalized shipment status */
export type ShipmentStatus =
  | "created"
  | "pending"
  | "picked_up"
  | "in_transit"
  | "at_warehouse"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "cancelled"
  | "returned"
  | "unknown";

/** Created shipment response */
export interface Shipment {
  id?: string;
  carrier: string;
  trackingNumber: string;
  customerTracking?: string;
  reference?: string;
  status: ShipmentStatus;
  statusLabel: string;
  labelUrl?: string;
  pdfLabelUrl?: string;
  returnLabel?: string;
  codAmount?: number;
  declaredValue?: number;
  currency: string;
  createdAt: Date;
  raw?: unknown;
}

// ============================================================================
// TRACKING
// ============================================================================

export interface TrackingEvent {
  timestamp: Date;
  statusCode: string;
  status: ShipmentStatus;
  description: string;
  descriptionArabic?: string;
  location?: string;
}

export interface TrackingResult {
  trackingNumber: string;
  carrier: string;
  reference?: string;
  status: ShipmentStatus;
  statusLabel: string;
  events: TrackingEvent[];
  estimatedDelivery?: Date;
  deliveryDate?: Date;
  pickupDate?: Date;
  receivedAt?: Date;
  codAmount?: number;
  weight?: number;
  pieces?: number;
  raw?: unknown;
}

// ============================================================================
// PICKUPS
// ============================================================================

export interface TimeSlot {
  id: string;
  label: string;
  startTime?: string;
  endTime?: string;
}

export interface PickupRequest {
  date: string; // YYYY-MM-DD
  timeSlot: string;
  city: string;
  contactName: string;
  contactPhone: string;
  address: string;
  shipmentCount: number;
  trackingNumbers?: string[];
}

export interface Pickup {
  id: number | string;
  carrier: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  date: string;
  timeSlot: string;
  city: string;
  contactName: string;
  contactPhone: string;
  address: string;
  shipmentCount: number;
  warehouseId?: number;
  warehouseName?: string;
  createdAt: Date;
  raw?: unknown;
}

// ============================================================================
// CITIES & LOCATIONS
// ============================================================================

export interface City {
  nameEn: string;
  nameAr?: string;
  code?: string;
}

export interface Location {
  id: string | number;
  name: string;
  nameAr?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// WEBHOOKS
// ============================================================================

export type WebhookEventType = "status_update" | "weight_update";

export interface WebhookEvent {
  carrier: string;
  eventType: WebhookEventType;
  trackingNumber: string;
  reference?: string;
  status: ShipmentStatus;
  statusCode: string;
  statusLabel: string;
  reasonCode?: string;
  reasonLabel?: string;
  timestamp: Date;
  raw: unknown;
}

export interface WebhookConfig {
  /** Header name for auth (e.g., 'X-Aymakan-Auth') */
  authHeader?: string;
  /** Expected header value */
  authValue?: string;
  /** Query param name for auth (e.g., 'secret') */
  authQueryParam?: string;
  /** Expected query param value */
  authQueryValue?: string;
}

// ============================================================================
// RATES (Future)
// ============================================================================

export interface Rate {
  carrier: string;
  serviceType: string;
  serviceName: string;
  amount: number;
  currency: string;
  estimatedDays?: number;
  raw?: unknown;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface CarrierCredentials {
  [key: string]: string | undefined;
}

export interface CarrierConfig {
  mode: "sandbox" | "production";
  credentials: CarrierCredentials;
}
