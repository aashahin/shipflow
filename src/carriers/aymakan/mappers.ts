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
import { AymakanStatusCodes } from "./services";
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

export function mapAymakanStatus(statusCode: string): ShipmentStatus {
  const mapped =
    AymakanStatusCodes[statusCode as keyof typeof AymakanStatusCodes];
  return (mapped as ShipmentStatus) ?? "unknown";
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

  return {
    requested_by: input.options?.requestedBy ?? input.shipper.name,
    declared_value: input.declaredValue?.amount ?? input.cod?.amount ?? 0,
    declared_value_currency:
      input.declaredValue?.currency ?? input.cod?.currency ?? "SAR",
    reference: input.reference,
    customer_tracking: input.options?.customerTracking,
    service_type: input.serviceType ?? "ONP",
    is_cod: input.cod?.enabled ? 1 : 0,
    cod_amount: input.cod?.enabled ? input.cod.amount : undefined,
    fulfilment_customer_name: input.options?.fulfilmentCustomerName,
    currency: input.cod?.currency ?? "SAR",

    // Delivery (consignee)
    delivery_name: input.consignee.name,
    delivery_email: input.consignee.email,
    delivery_city: input.consignee.city,
    delivery_address: input.consignee.line1,
    delivery_neighbourhood:
      input.consignee.neighbourhood ?? input.consignee.state,
    delivery_postcode: input.consignee.postalCode,
    delivery_country: input.consignee.countryCode,
    delivery_phone: input.consignee.phone,
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
    collection_phone: input.shipper.phone,
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
    status: mapAymakanStatus(data.status) || "created",
    statusLabel: data.status_label,
    labelUrl: data.label || undefined,
    pdfLabelUrl: data.pdf_label || undefined,
    codAmount: codAmount && !Number.isNaN(codAmount) ? codAmount : undefined,
    declaredValue: data.declared_value,
    currency: data.currency,
    createdAt: new Date(data.created_at),
    raw: data,
  };
}

export function mapTrackingEvent(event: AymakanTrackingEvent): TrackingEvent {
  return {
    timestamp: new Date(event.created_at),
    statusCode: event.status_code,
    status: mapAymakanStatus(event.status_code),
    description: event.description,
    descriptionArabic: event.description_ar ?? undefined,
  };
}

export function mapTrackingResult(
  data: AymakanTrackShipmentData,
): TrackingResult {
  return {
    trackingNumber: data.tracking_number,
    carrier: "aymakan",
    reference: data.reference ?? undefined,
    status: mapAymakanStatus(data.status),
    statusLabel: data.status_label,
    events: data.tracking_info.map(mapTrackingEvent),
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

export function parseAymakanWebhook(
  payload: unknown,
  options?: {
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    config?: WebhookConfig;
  },
): WebhookEvent {
  const { headers = {}, queryParams = {}, config } = options ?? {};

  // Validate required fields
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

  // Verify auth via header (case-insensitive lookup)
  if (config?.authHeader && config?.authValue) {
    const lowerKey = config.authHeader.toLowerCase();
    const headerValue = Object.entries(headers).find(
      ([k]) => k.toLowerCase() === lowerKey,
    )?.[1];
    if (headerValue !== config.authValue) {
      throw new WebhookVerificationError("Invalid webhook auth header", {
        carrier: "aymakan",
      });
    }
  }

  // Verify auth via query param
  if (config?.authQueryParam && config?.authQueryValue) {
    const paramValue = queryParams[config.authQueryParam];
    if (paramValue !== config.authQueryValue) {
      throw new WebhookVerificationError("Invalid webhook auth query param", {
        carrier: "aymakan",
      });
    }
  }

  return {
    carrier: "aymakan",
    eventType: data.event ?? "status_update",
    trackingNumber: data.tracking_number,
    reference: data.reference ?? undefined,
    status: mapAymakanStatus(data.status),
    statusCode: data.status,
    statusLabel: data.status_label,
    reasonCode: data.reason_code ?? undefined,
    reasonLabel: data.reason_en ?? undefined,
    timestamp: new Date(data.date_time),
    raw: data,
  };
}
