// file: src/carriers/smsaexpress/mappers.ts
/**
 * SMSA Express Data Mappers
 * Transform between unified ShipFlow types and SMSA Express API formats.
 */

import {
  APIError,
  ValidationError,
  WebhookVerificationError,
} from "../../core/errors";
import type {
  City,
  CreateShipmentInput,
  Location,
  Shipment,
  ShipmentStatus,
  TrackingEvent,
  TrackingResult,
  WebhookConfig,
  WebhookEvent,
} from "../../core/types";
import { SMSAStatusCodes } from "./services";
import type {
  SMSACityLookupItem,
  SMSACreate2WayShipmentRequest,
  SMSACreateB2CShipmentRequest,
  SMSACreateC2BShipmentRequest,
  SMSAOfficeLookupItem,
  SMSAShipmentAddress,
  SMSAShipmentResponse,
  SMSATrackingResponse,
  SMSATrackingScan,
  SMSAWebhookShipment,
} from "./types";

// ============================================================================
// STATUS MAPPING
// ============================================================================

export function mapSMSAStatus(scanType: string): ShipmentStatus {
  return (SMSAStatusCodes[scanType] as ShipmentStatus) ?? "in_transit";
}

/**
 * Derive the current shipment status from tracking scans.
 * Scans are ordered newest-first by the API, so the first scan is the latest.
 */
function deriveStatusFromScans(
  scans: SMSATrackingScan[],
  isDelivered?: boolean,
): { status: ShipmentStatus; statusLabel: string } {
  if (isDelivered) {
    return { status: "delivered", statusLabel: "Delivered" };
  }
  const latest = scans[0];
  if (!latest) {
    return { status: "unknown", statusLabel: "Unknown" };
  }
  return {
    status: mapSMSAStatus(latest.ScanType),
    statusLabel: latest.ScanDescription,
  };
}

// ============================================================================
// REQUEST MAPPERS
// ============================================================================

function mapAddress(
  addr: CreateShipmentInput["shipper"] | CreateShipmentInput["consignee"],
): SMSAShipmentAddress {
  const result: SMSAShipmentAddress = {
    ContactName: addr.name,
    ContactPhoneNumber: addr.phone,
    Country: addr.countryCode,
    City: addr.city,
    AddressLine1: addr.line1,
    AddressLine2: addr.line2,
    District: addr.neighbourhood ?? addr.state,
    PostalCode: addr.postalCode,
  };

  if (addr.coordinates) {
    result.Coordinates = `${addr.coordinates.latitude},${addr.coordinates.longitude}`;
  }

  if (addr.nationalAddress?.shortCode) {
    result.ShortCode = addr.nationalAddress.shortCode;
  }

  return result;
}

export function mapCreateB2CRequest(
  input: CreateShipmentInput,
): SMSACreateB2CShipmentRequest {
  const totalPieces = input.parcels.reduce((sum, p) => sum + p.pieces, 0);
  const totalWeight = input.parcels.reduce(
    (sum, p) =>
      sum +
      (p.weight.unit === "lb" ? p.weight.value * 0.453592 : p.weight.value),
    0,
  );

  const consigneeAddress = mapAddress(input.consignee);
  if (input.options?.metadata?.consigneeId) {
    consigneeAddress.ConsigneeID = input.options.metadata.consigneeId as string;
  }

  return {
    ConsigneeAddress: consigneeAddress,
    ShipperAddress: mapAddress(input.shipper),
    OrderNumber: input.reference ?? `ORD-${Date.now()}`,
    CODAmount: input.cod?.enabled ? input.cod.amount : 0,
    DeclaredValue: input.declaredValue?.amount ?? 0,
    ContentDescription: input.parcels[0]?.description ?? "Shipment contents",
    Parcels: totalPieces,
    ShipDate: new Date().toISOString().slice(0, 19),
    ShipmentCurrency:
      input.declaredValue?.currency ?? input.cod?.currency ?? "SAR",
    Weight: totalWeight,
    WeightUnit: "KG",
    WaybillType: input.labelFormat === "ZPL" ? "ZPL" : "PDF",
    ServiceCode: input.serviceType,
    SMSARetailID: (input.options?.metadata?.smsaRetailId as string) ?? "0",
    VatPaid: (input.options?.metadata?.vatPaid as boolean) ?? true,
    DutyPaid: (input.options?.metadata?.dutyPaid as boolean) ?? false,
  };
}

/**
 * Map to C2B (reverse pickup) request.
 * In C2B flow, the consignee is the pickup point (customer returning),
 * and the shipper is the return-to address (merchant warehouse).
 */
export function mapCreateC2BRequest(
  input: CreateShipmentInput,
): SMSACreateC2BShipmentRequest {
  const totalPieces = input.parcels.reduce((sum, p) => sum + p.pieces, 0);
  const totalWeight = input.parcels.reduce(
    (sum, p) =>
      sum +
      (p.weight.unit === "lb" ? p.weight.value * 0.453592 : p.weight.value),
    0,
  );

  return {
    PickupAddress: mapAddress(input.consignee),
    ReturnToAddress: mapAddress(input.shipper),
    OrderNumber: input.reference ?? `ORD-${Date.now()}`,
    DeclaredValue: input.declaredValue?.amount ?? 0.1,
    ContentDescription:
      input.parcels[0]?.description ?? "Return shipment contents",
    Parcels: totalPieces,
    ShipDate: new Date().toISOString().slice(0, 19),
    ShipmentCurrency:
      input.declaredValue?.currency ?? input.cod?.currency ?? "SAR",
    Weight: totalWeight,
    WeightUnit: "KG",
    WaybillType: input.labelFormat === "ZPL" ? "ZPL" : "PDF",
    ServiceCode: input.serviceType ?? "EDCR",
    SMSARetailID: (input.options?.metadata?.smsaRetailId as string) ?? "0",
  };
}

// ============================================================================
// RESPONSE MAPPERS
// ============================================================================

export function mapShipmentResponse(
  data: SMSAShipmentResponse,
  input: CreateShipmentInput,
): Shipment {
  const firstWaybill = data.waybills?.[0];
  const trackingNumber = firstWaybill?.awb ?? data.sawb;

  if (!trackingNumber) {
    throw new APIError("No tracking number in shipment response", {
      carrier: "smsaexpress",
      raw: data,
    });
  }

  return {
    carrier: "smsaexpress",
    trackingNumber,
    reference: input.reference,
    status: "created",
    statusLabel: "Created",
    codAmount: input.cod?.enabled ? input.cod.amount : undefined,
    declaredValue: input.declaredValue?.amount,
    currency: input.declaredValue?.currency ?? input.cod?.currency ?? "SAR",
    returnLabel: firstWaybill?.returnBarcode
      ? `data:application/pdf;base64,${firstWaybill.returnBarcode}`
      : undefined,
    createdAt: new Date(
      /[Z]$|[+-]\d{2}(:\d{2})?$/.test(data.createDate)
        ? data.createDate
        : `${data.createDate}+03:00`,
    ),
    raw: data,
  };
}

export function mapTrackingEvent(scan: SMSATrackingScan): TrackingEvent {
  return {
    timestamp: new Date(
      scan.ScanTimeZone
        ? `${scan.ScanDateTime}${scan.ScanTimeZone}`
        : scan.ScanDateTime,
    ),
    statusCode: scan.ScanType,
    status: mapSMSAStatus(scan.ScanType),
    description: scan.ScanDescription,
    location: scan.City,
  };
}

export function mapTrackingResult(data: SMSATrackingResponse): TrackingResult {
  const { status, statusLabel } = deriveStatusFromScans(
    data.Scans,
    data.isDelivered,
  );

  const deliveredScan = data.Scans.find((s) => s.ScanType === "DL");
  const deliveredTimestamp = deliveredScan
    ? new Date(
        deliveredScan.ScanTimeZone
          ? `${deliveredScan.ScanDateTime}${deliveredScan.ScanTimeZone}`
          : deliveredScan.ScanDateTime,
      )
    : undefined;

  return {
    trackingNumber: data.AWB,
    carrier: "smsaexpress",
    reference: data.Reference || undefined,
    status,
    statusLabel,
    events: data.Scans.map(mapTrackingEvent),
    deliveryDate: deliveredTimestamp,
    codAmount: data.CODAmount > 0 ? data.CODAmount : undefined,
    pieces: data.Pieces,
    raw: data,
  };
}

export function mapCity(city: SMSACityLookupItem): City {
  return {
    nameEn: city.cityName,
    code: city.cityCode,
  };
}

export function mapOffice(office: SMSAOfficeLookupItem): Location {
  const [lat, lng] = (office.coordinates || "")
    .split(",")
    .map((s) => parseFloat(s.trim()));

  return {
    id: office.code,
    name: office.address,
    nameAr: office.addressAR,
    city: office.cityName,
    latitude: Number.isNaN(lat) ? undefined : lat,
    longitude: Number.isNaN(lng) ? undefined : lng,
  };
}

export function mapCreate2WayRequest(
  input: CreateShipmentInput,
): SMSACreate2WayShipmentRequest {
  const totalPieces = input.parcels.reduce((sum, p) => sum + p.pieces, 0);
  const totalWeight = input.parcels.reduce(
    (sum, p) =>
      sum +
      (p.weight.unit === "lb" ? p.weight.value * 0.453592 : p.weight.value),
    0,
  );

  const consigneeAddress = mapAddress(input.consignee);
  if (input.options?.metadata?.consigneeId) {
    consigneeAddress.ConsigneeID = input.options.metadata.consigneeId as string;
  }

  return {
    ConsigneeAddress: consigneeAddress,
    ShipperAddress: mapAddress(input.shipper),
    OrderNumber: input.reference ?? `ORD-${Date.now()}`,
    DeclaredValue: input.declaredValue?.amount ?? 0,
    ContentDescription: input.parcels[0]?.description ?? "Shipment contents",
    Parcels: totalPieces,
    ShipDate: new Date().toISOString().slice(0, 19),
    ShipmentCurrency: input.declaredValue?.currency ?? "SAR",
    Weight: totalWeight,
    WeightUnit: "KG",
    WaybillType: input.labelFormat === "ZPL" ? "ZPL" : "PDF",
    SMSARetailID: (input.options?.metadata?.smsaRetailId as string) ?? "0",
    VatPaid: (input.options?.metadata?.vatPaid as boolean) ?? true,
    DutyPaid: (input.options?.metadata?.dutyPaid as boolean) ?? false,
  };
}

// ============================================================================
// WEBHOOK MAPPERS
// ============================================================================

function verifyWebhookAuth(options?: {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  config?: WebhookConfig;
}): void {
  const { headers = {}, queryParams = {}, config } = options ?? {};

  // Verify auth via header (case-insensitive lookup)
  if (config?.authHeader && config?.authValue) {
    const lowerKey = config.authHeader.toLowerCase();
    const headerValue = Object.entries(headers).find(
      ([k]) => k.toLowerCase() === lowerKey,
    )?.[1];
    if (headerValue !== config.authValue) {
      throw new WebhookVerificationError("Invalid webhook auth header", {
        carrier: "smsaexpress",
      });
    }
  }

  // Verify auth via query param (SMSA uses API key as query param)
  if (config?.authQueryParam && config?.authQueryValue) {
    const paramValue = queryParams[config.authQueryParam];
    if (paramValue !== config.authQueryValue) {
      throw new WebhookVerificationError("Invalid webhook auth query param", {
        carrier: "smsaexpress",
      });
    }
  }
}

function mapWebhookShipmentToEvent(
  shipment: SMSAWebhookShipment,
): WebhookEvent {
  const { status, statusLabel } = deriveStatusFromScans(
    shipment.Scans,
    shipment.isDelivered,
  );

  const latestScan = shipment.Scans[0];
  const timestamp = latestScan
    ? new Date(
        latestScan.ScanTimeZone
          ? `${latestScan.ScanDateTime}${latestScan.ScanTimeZone}`
          : latestScan.ScanDateTime,
      )
    : new Date();

  return {
    carrier: "smsaexpress",
    eventType: "status_update",
    trackingNumber: shipment.AWB,
    reference: shipment.Reference || undefined,
    status,
    statusCode: latestScan?.ScanType ?? "unknown",
    statusLabel,
    timestamp,
    raw: shipment,
  };
}

function validateWebhookPayload(payload: unknown): SMSAWebhookShipment[] {
  if (!Array.isArray(payload)) {
    throw new ValidationError(
      "Invalid SMSA webhook payload: expected an array of shipments",
      { raw: payload },
    );
  }

  if (payload.length === 0) {
    throw new ValidationError("Invalid SMSA webhook payload: empty array", {
      raw: payload,
    });
  }

  for (const item of payload) {
    if (
      !item ||
      typeof item !== "object" ||
      !("AWB" in item) ||
      !("Scans" in item)
    ) {
      throw new ValidationError(
        "Invalid SMSA webhook payload: shipment missing required fields (AWB, Scans)",
        { raw: item },
      );
    }
  }

  return payload as SMSAWebhookShipment[];
}

/**
 * Parse an SMSA webhook payload and return a single WebhookEvent
 * for the first shipment in the batch.
 *
 * SMSA sends webhooks as an array of shipments. This function returns
 * only the first item — use `parseSMSAWebhookBatch()` for full batch parsing.
 */
export function parseSMSAWebhook(
  payload: unknown,
  options?: {
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    config?: WebhookConfig;
  },
): WebhookEvent {
  verifyWebhookAuth(options);
  const shipments = validateWebhookPayload(payload);
  return mapWebhookShipmentToEvent(shipments[0]!);
}

/**
 * Parse an SMSA webhook payload and return a WebhookEvent for every
 * shipment in the batch.
 *
 * SMSA sends webhook payloads as an array of shipments, each with
 * their own tracking scans.
 */
export function parseSMSAWebhookBatch(
  payload: unknown,
  options?: {
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    config?: WebhookConfig;
  },
): WebhookEvent[] {
  verifyWebhookAuth(options);
  const shipments = validateWebhookPayload(payload);
  return shipments.map(mapWebhookShipmentToEvent);
}
