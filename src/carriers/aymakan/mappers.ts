// file: src/carriers/aymakan/mappers.ts
/**
 * Aymakan Data Mappers
 * Transform between unified ShipFlow types and Aymakan API formats.
 */

import { ValidationError, WebhookVerificationError } from "../../core/errors";
import type {
  Address,
  City,
  CreateShipmentInput,
  CustomerAddress,
  Pickup,
  PickupRequest,
  Shipment,
  ShipmentStatus,
  TrackingEvent,
  TrackingResult,
  WebhookConfig,
  WebhookEvent,
} from "../../core/types";
import { AymakanService, AymakanStatusCodes } from "./services";
import type {
  AymakanAddressRequest,
  AymakanCity,
  AymakanCreateShipmentRequest,
  AymakanNationalAddressRequest,
  AymakanPickupRequest,
  AymakanPickupResponse,
  AymakanShipmentResponse,
  AymakanTrackingEvent,
  AymakanTrackShipmentData,
  AymakanWebhookPayload,
} from "./types";

// ============================================================================
// STATUS MAPPING
// ============================================================================

export function mapAymakanStatus(statusCode: string): ShipmentStatus | undefined {
  const mapped =
    AymakanStatusCodes[statusCode as keyof typeof AymakanStatusCodes];
  return mapped as ShipmentStatus | undefined;
}

/**
 * The /track endpoint's top-level `status` is a human-readable English label
 * (e.g. "Received at Warehouse") rather than an AY code, so `mapAymakanStatus`
 * can never resolve it. This map recovers a real unified status from that label
 * when there are no tracking events to derive it from. Keys are compared
 * case-insensitively.
 */
const AymakanStatusLabels: Record<string, ShipmentStatus> = {
  "awb created at origin": "created",
  "shipment created": "created",
  "collected from collection point": "picked_up",
  collected: "picked_up",
  "picked up": "picked_up",
  "received at hub": "at_warehouse",
  "received at warehouse": "at_warehouse",
  "out for delivery": "out_for_delivery",
  "out for final destination": "out_for_delivery",
  delivered: "delivered",
  "shipment is delivered": "delivered",
  "transferred to destination city": "in_transit",
  "in transit": "in_transit",
  "not delivered": "exception",
  "failed attempt": "exception",
  pending: "pending",
  "future delivery": "pending",
  returned: "returned",
  "returned to shipper": "returned",
  "return to origin": "returned",
  cancelled: "cancelled",
  canceled: "cancelled",
};

/**
 * Map a human-readable Aymakan status label to a unified status.
 * Returns undefined for unrecognized labels.
 */
export function mapAymakanStatusLabel(
  label: string,
): ShipmentStatus | undefined {
  return AymakanStatusLabels[label.trim().toLowerCase()];
}

// ============================================================================
// REQUEST MAPPERS
// ============================================================================

function mapNationalAddress(
  addr?: Address["nationalAddress"],
): AymakanNationalAddressRequest | undefined {
  if (!addr) return undefined;
  return {
    short_code: addr.shortCode,
    building_number: addr.buildingNumber,
    street_name: addr.streetName,
    district: addr.district,
    additional_number: addr.additionalNumber,
  };
}

/** Strip non-digit characters from phone numbers (Aymakan requires digits only) */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Set of valid Aymakan service type codes */
const VALID_AYMAKAN_SERVICE_TYPES = new Set(
  Object.values(AymakanService) as string[],
);

/**
 * Resolve service type to a valid Aymakan code.
 * Returns undefined for unknown values so the API uses its default (ONP/ecommerce).
 */
function resolveServiceType(serviceType?: string): string | undefined {
  if (!serviceType) return undefined;
  if (VALID_AYMAKAN_SERVICE_TYPES.has(serviceType)) return serviceType;
  return undefined;
}

export function mapCreateShipmentRequest(
  input: CreateShipmentInput,
): AymakanCreateShipmentRequest {
  const firstParcel = input.parcels[0];
  const totalPieces = input.parcels.reduce((sum, p) => sum + p.pieces, 0);
  const totalWeight = input.parcels.reduce(
    (sum, p) =>
      sum +
      (p.weight.unit === "lb" ? p.weight.value * 0.453592 : p.weight.value),
    0,
  );
  const totalItems = input.parcels.reduce(
    (sum, p) => sum + (p.itemsCount ?? p.pieces),
    0,
  );

  // COD (collected from the buyer on delivery) and declared/customs value are
  // distinct concepts and must never be conflated. Declared value comes solely
  // from input.declaredValue; COD comes solely from input.cod.
  const codEnabled = input.cod?.enabled === true;
  const declaredValueCurrency = input.declaredValue?.currency ?? "SAR";

  return {
    requested_by: input.options?.requestedBy ?? input.shipper.name,
    declared_value: input.declaredValue?.amount ?? 0,
    declared_value_currency: declaredValueCurrency,
    reference: input.reference,
    customer_tracking: input.options?.customerTracking,
    service_type: resolveServiceType(input.serviceType),
    is_cod: codEnabled ? 1 : 0,
    cod_amount: codEnabled ? input.cod?.amount : undefined,
    fulfilment_customer_name: input.options?.fulfilmentCustomerName,
    // Top-level currency prefers the COD currency when COD is enabled (it's the
    // amount actually collected), otherwise the declared-value currency.
    currency: codEnabled
      ? (input.cod?.currency ?? "SAR")
      : declaredValueCurrency,

    // Delivery (consignee)
    delivery_name: input.consignee.name,
    delivery_email: input.consignee.email,
    delivery_city: input.consignee.city,
    delivery_address: input.consignee.line1,
    delivery_neighbourhood:
      input.consignee.neighbourhood ?? input.consignee.state,
    delivery_postcode: input.consignee.postalCode,
    delivery_country: input.consignee.countryCode,
    delivery_phone: sanitizePhone(input.consignee.phone),
    delivery_description: input.consignee.description,
    delivery_national_address: mapNationalAddress(
      input.consignee.nationalAddress,
    ),

    // Collection (shipper)
    collection_name: input.shipper.company ?? input.shipper.name,
    collection_email: input.shipper.email,
    collection_city: input.shipper.city,
    collection_address: input.shipper.line1,
    collection_neighbourhood:
      input.shipper.neighbourhood ?? input.shipper.state,
    collection_postcode: input.shipper.postalCode,
    collection_country: input.shipper.countryCode,
    collection_phone: sanitizePhone(input.shipper.phone),
    collection_description: input.shipper.description,
    collection_national_address: mapNationalAddress(
      input.shipper.nationalAddress,
    ),

    // Parcel details
    weight: totalWeight,
    length: firstParcel?.dimensions?.length,
    width: firstParcel?.dimensions?.width,
    height: firstParcel?.dimensions?.height,
    pieces: totalPieces,
    items_count: totalItems,
    is_insured: input.options?.isInsured ? 1 : 0,

    // International
    international_metadata: input.options?.internationalMetadata
      ? {
        document_id: input.options.internationalMetadata.documentId,
        tax_identification_number: input.options.internationalMetadata.taxId,
        invoice_number: input.options.internationalMetadata.invoiceNumber,
        invoice_date: input.options.internationalMetadata.invoiceDate,
      }
      : undefined,
  };
}

export function mapPickupRequest(input: PickupRequest): AymakanPickupRequest {
  return {
    reference: input.trackingNumbers?.[0],
    pickup_date: input.date,
    time_slot: input.timeSlot,
    city: input.city,
    contact_name: input.contactName,
    contact_phone: input.contactPhone,
    address: input.address,
    shipments: input.shipmentCount,
  };
}

export function mapCustomerAddressRequest(
  addr: CustomerAddress,
): AymakanAddressRequest {
  return {
    title: addr.title,
    name: addr.name,
    email: addr.email,
    city: addr.city,
    address: addr.address,
    neighbourhood: addr.neighbourhood,
    postcode: addr.postalCode ?? "",
    phone: addr.phone,
    description: addr.description ?? "",
  };
}

// ============================================================================
// RESPONSE MAPPERS
// ============================================================================

export function mapShipmentResponse(data: AymakanShipmentResponse): Shipment {
  // Parse cod_amount: API returns string like "150.00", we need number
  const codAmount =
    data.cod_amount != null
      ? typeof data.cod_amount === "string"
        ? parseFloat(data.cod_amount)
        : data.cod_amount
      : undefined;

  return {
    carrier: "aymakan",
    trackingNumber: data.tracking_number,
    customerTracking: data.customer_tracking ?? undefined,
    reference: data.reference ?? undefined,
    status: mapAymakanStatus(data.status) ?? "created",
    statusLabel: data.status_label,
    labelUrl: data.label || undefined,
    pdfLabelUrl: data.pdf_label || undefined,
    // Emit a defined COD amount whenever we parsed a real number. A COD of 0
    // means "no cash collected", so surface it as undefined, but never let NaN
    // logic on a falsy 0 drop an otherwise valid value.
    codAmount:
      codAmount != null && !Number.isNaN(codAmount) && codAmount !== 0
        ? codAmount
        : undefined,
    declaredValue: data.declared_value,
    currency: data.currency,
    createdAt: new Date(data.created_at),
    raw: data,
  };
}

/**
 * Parse an Aymakan timestamp. Top-level fields are ISO 8601 (with `T`/`Z`), but
 * `tracking_info[].created_at` values are space-separated "YYYY-MM-DD HH:MM:SS"
 * strings in Saudi local time (UTC+3) with no timezone marker. `new Date()`
 * would parse those in the host's local timezone, so normalize to +03:00.
 */
function parseAymakanDate(value: string): Date {
  if (/[TZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value);
  }
  return new Date(`${value.replace(" ", "T")}+03:00`);
}

export function mapTrackingEvent(event: AymakanTrackingEvent): TrackingEvent {
  return {
    timestamp: parseAymakanDate(event.created_at),
    statusCode: event.status_code,
    status: mapAymakanStatus(event.status_code) ?? "unknown",
    description: event.description,
    descriptionArabic: event.description_ar ?? undefined,
  };
}

export function mapTrackingResult(
  data: AymakanTrackShipmentData,
): TrackingResult {
  const events = (data.tracking_info ?? []).map(mapTrackingEvent);

  // The top-level `status` field is a human-readable label on the /track
  // endpoint (e.g. "Received at Warehouse") and an AY code on /by_reference.
  // Derive the unified status from the most recent tracking event (whose
  // status_code is always an AY code), falling back to mapping the top-level
  // status. The fallback tries the AY-code map first (handles /by_reference)
  // and then the human-label map (handles /track), so a real state is recovered
  // even when there are no events, then "unknown".
  const sortedEvents = events.length
    ? [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    : [];
  // Some event codes aren't in AymakanStatusCodes and map to "unknown" — scan
  // back through older events (newest-first) for the most recent one we can
  // actually recognize, instead of giving up as soon as the latest is unknown.
  const mostRecentRecognizedEvent = sortedEvents.find(
    (e) => e.status !== "unknown",
  );
  let status: ShipmentStatus;
  if (mostRecentRecognizedEvent) {
    status = mostRecentRecognizedEvent.status;
  } else {
    // No recognizable event (or none at all) — derive from the top-level
    // status: AY-code map first (/by_reference), then human-label map (/track),
    // else "unknown".
    status =
      mapAymakanStatus(data.status) ??
      mapAymakanStatusLabel(data.status) ??
      "unknown";
  }

  return {
    trackingNumber: data.tracking_number,
    carrier: "aymakan",
    reference: data.reference ?? undefined,
    status,
    statusLabel: data.status_label,
    events,
    deliveryDate: data.delivery_date ? new Date(data.delivery_date) : undefined,
    pickupDate: data.pickup_date ? new Date(data.pickup_date) : undefined,
    receivedAt: data.received_at ? new Date(data.received_at) : undefined,
    codAmount: data.cod_amount
      ? Number.isNaN(parseFloat(data.cod_amount))
        ? undefined
        : parseFloat(data.cod_amount)
      : undefined,
    weight: Number.isNaN(parseFloat(data.weight))
      ? undefined
      : parseFloat(data.weight),
    pieces: data.pieces,
    raw: data,
  };
}

export function mapCity(city: AymakanCity): City {
  return {
    nameEn: city.city_en,
    nameAr: city.city_ar,
  };
}

export function mapPickupResponse(data: AymakanPickupResponse["data"]): Pickup {
  return {
    id: data.id,
    carrier: "aymakan",
    status: (
      ["pending", "processing", "completed", "cancelled"] as const
    ).includes(data.status as Pickup["status"])
      ? (data.status as Pickup["status"])
      : "pending",
    date: data.pickup_date,
    timeSlot: data.time_slot,
    city: data.city,
    contactName: data.contact_name,
    contactPhone: data.contact_phone,
    address: data.address,
    shipmentCount: data.shipments,
    warehouseId: data.warehouse_id,
    warehouseName: data.warehouse_name,
    createdAt: new Date(data.created_at),
    raw: data,
  };
}

// ============================================================================
// WEBHOOK MAPPER
// ============================================================================

/**
 * Timing-safe string comparison to prevent timing attacks on auth tokens.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  // Use crypto.subtle-compatible constant-time compare
  let mismatch = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    mismatch |= bufA[i]! ^ bufB[i]!;
  }
  return mismatch === 0;
}

export function parseAymakanWebhook(
  payload: unknown,
  options?: {
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    config?: WebhookConfig;
  },
): WebhookEvent {
  const { headers = {}, queryParams = {}, config } = options ?? {};

  // Verify auth FIRST, before inspecting the payload shape. These checks depend
  // only on `options` (headers/queryParams/config), so an unauthenticated caller
  // is rejected before any payload-validation detail can leak back to them.

  // Verify auth via header (case-insensitive lookup, timing-safe comparison)
  if (config?.authHeader && config?.authValue) {
    const lowerKey = config.authHeader.toLowerCase();
    const headerValue = Object.entries(headers).find(
      ([k]) => k.toLowerCase() === lowerKey,
    )?.[1];
    if (!headerValue || !timingSafeEqual(headerValue, config.authValue)) {
      throw new WebhookVerificationError("Invalid webhook auth header", {
        carrier: "aymakan",
      });
    }
  }

  // Verify auth via query param (timing-safe comparison)
  if (config?.authQueryParam && config?.authQueryValue) {
    const paramValue = queryParams[config.authQueryParam];
    if (!paramValue || !timingSafeEqual(paramValue, config.authQueryValue)) {
      throw new WebhookVerificationError("Invalid webhook auth query param", {
        carrier: "aymakan",
      });
    }
  }

  // Validate required fields (only after auth has passed)
  if (
    !payload ||
    typeof payload !== "object" ||
    !("tracking_number" in payload) ||
    !("status" in payload)
  ) {
    throw new ValidationError(
      "Invalid webhook payload: missing required fields",
      {
        raw: payload,
      },
    );
  }

  const data = payload as AymakanWebhookPayload;

  const eventType = data.event ?? "status_update";

  // Validate timestamp
  const timestamp = new Date(data.date_time);
  if (Number.isNaN(timestamp.getTime())) {
    throw new ValidationError(
      "Invalid webhook payload: invalid date_time value",
      { raw: data.date_time },
    );
  }

  return {
    carrier: "aymakan",
    eventType,
    trackingNumber: data.tracking_number,
    reference: data.reference ?? undefined,
    // `status` is a core field present on every webhook regardless of event
    // type, so map it even for weight_update events. Consumers can still branch
    // on `eventType` to detect weight updates.
    status: mapAymakanStatus(data.status) ?? "unknown",
    statusCode: data.status,
    statusLabel: data.status_label,
    reasonCode: data.reason_code ?? undefined,
    reasonLabel: data.reason_en ?? undefined,
    timestamp,
    raw: data,
  };
}
