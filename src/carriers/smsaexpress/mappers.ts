// file: src/carriers/smsaexpress/mappers.ts
/**
 * SMSA Express Data Mappers
 * Transform between unified ShipFlow types and SMSA Express API formats.
 */

import {
  APIError,
  MalformedResponseError,
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
  return (SMSAStatusCodes[scanType] as ShipmentStatus) ?? "unknown";
}

/**
 * Resolve a scan's Date, applying its ScanTimeZone offset when present
 * (consistent with mapTrackingEvent / mapShipmentResponse timestamp handling).
 */
function scanDate(scan: SMSATrackingScan): Date {
  return new Date(
    scan.ScanTimeZone
      ? `${scan.ScanDateTime}${scan.ScanTimeZone}`
      : scan.ScanDateTime,
  );
}

function scanTimestampMs(scan: SMSATrackingScan): number {
  return scanDate(scan).getTime();
}

/**
 * Derive the current shipment status from tracking scans.
 * Defensively sorts by (zone-adjusted) ScanDateTime descending before taking
 * the latest.
 */
function deriveStatusFromScans(
  scans: SMSATrackingScan[] | undefined,
  isDelivered?: boolean,
): { status: ShipmentStatus; statusLabel: string } {
  if (isDelivered) {
    return { status: "delivered", statusLabel: "Delivered" };
  }
  // Records may omit Scans entirely (freshly-booked AWB, partial bulk record).
  const safeScans = scans ?? [];
  if (safeScans.length === 0) {
    return { status: "unknown", statusLabel: "Unknown" };
  }
  const sorted = [...safeScans].sort(
    (a, b) => scanTimestampMs(b) - scanTimestampMs(a),
  );
  const latest = sorted[0]!;
  return {
    status: mapSMSAStatus(latest.ScanType),
    statusLabel: latest.ScanDescription,
  };
}

// ============================================================================
// REQUEST MAPPERS
// ============================================================================

/**
 * Round a weight to 3 decimal places to avoid float-arithmetic noise
 * (e.g. 0.1 + 0.2 = 0.30000000000000004) leaking into the API payload.
 */
function roundWeight(weight: number): number {
  return Math.round(weight * 1000) / 1000;
}

/** Strip non-digit characters from phone numbers (SMSA requires digits only). */
function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Generate a fallback OrderNumber when the caller supplies no reference. Single
 * source of the `ORD-<epoch-ms>` format — the adapter uses it to fix a reference
 * on the input so the booked OrderNumber is surfaced back on the Shipment, and
 * the request mappers reference it as their type-required default.
 */
export function generateOrderNumber(): string {
  return `ORD-${Date.now()}`;
}

/**
 * Format the ShipDate as the Saudi (UTC+3) wall-clock, with no zone suffix.
 *
 * SMSA treats a bare (zone-less) timestamp as Saudi local time (UTC+3) — its
 * own responses come back bare and the response mapper appends `+03:00` to them.
 * Sending `new Date().toISOString().slice(0, 19)` (zero-offset UTC wall-clock)
 * therefore lands a day early between ~21:00–24:00 Saudi time, so shift by +3h
 * before formatting.
 */
function smsaShipDate(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19);
}

function mapAddress(
  addr: CreateShipmentInput["shipper"] | CreateShipmentInput["consignee"],
  opts?: { includeShortCode?: boolean },
): SMSAShipmentAddress {
  const result: SMSAShipmentAddress = {
    ContactName: addr.name,
    ContactPhoneNumber: sanitizePhone(addr.phone),
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

  // ShortCode is valid only on the consignee address per the SMSA spec.
  if (opts?.includeShortCode && addr.nationalAddress?.shortCode) {
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

  const consigneeAddress = mapAddress(input.consignee, {
    includeShortCode: true,
  });
  if (input.options?.metadata?.consigneeId) {
    consigneeAddress.ConsigneeID = input.options.metadata.consigneeId as string;
  }

  // ServiceCode is OPTIONAL on B2C create (SMSA docs). Account-enabled codes
  // come from GET /api/Lookup/ServiceTypes and vary by contract — do not invent
  // EDDL/EDEL. Only include the field when the caller supplied a code.
  const serviceCode = input.serviceType?.trim();

  return {
    ConsigneeAddress: consigneeAddress,
    ShipperAddress: mapAddress(input.shipper),
    OrderNumber: input.reference ?? generateOrderNumber(),
    CODAmount: input.cod?.enabled ? input.cod.amount : 0,
    DeclaredValue: input.declaredValue?.amount ?? 0,
    ContentDescription: input.parcels[0]?.description ?? "Shipment contents",
    Parcels: totalPieces,
    // SMSA reads bare timestamps as Saudi local time (UTC+3), so send the
    // UTC+3 wall-clock rather than zero-offset UTC.
    ShipDate: smsaShipDate(),
    // When COD is enabled, its currency is the amount physically collected
    // and must win over the declared-value currency.
    ShipmentCurrency:
      (input.cod?.enabled ? input.cod.currency : undefined) ??
      input.declaredValue?.currency ??
      input.cod?.currency ??
      "SAR",
    Weight: roundWeight(totalWeight),
    WeightUnit: "KG",
    WaybillType: input.labelFormat === "ZPL" ? "ZPL" : "PDF",
    ...(serviceCode ? { ServiceCode: serviceCode } : {}),
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
    PickupAddress: mapAddress(input.consignee, { includeShortCode: true }),
    ReturnToAddress: mapAddress(input.shipper),
    OrderNumber: input.reference ?? generateOrderNumber(),
    DeclaredValue: input.declaredValue?.amount ?? 0.1,
    ContentDescription:
      input.parcels[0]?.description ?? "Return shipment contents",
    Parcels: totalPieces,
    // SMSA reads bare timestamps as Saudi local time (UTC+3), so send the
    // UTC+3 wall-clock rather than zero-offset UTC.
    ShipDate: smsaShipDate(),
    // When COD is enabled, its currency is the amount physically collected
    // and must win over the declared-value currency.
    ShipmentCurrency:
      (input.cod?.enabled ? input.cod.currency : undefined) ??
      input.declaredValue?.currency ??
      input.cod?.currency ??
      "SAR",
    Weight: roundWeight(totalWeight),
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
    throw new MalformedResponseError("No tracking number in shipment response", {
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
    // When COD is enabled, its currency is the amount physically collected
    // and must win over the declared-value currency.
    currency:
      (input.cod?.enabled ? input.cod.currency : undefined) ??
      input.declaredValue?.currency ??
      input.cod?.currency ??
      "SAR",
    // SMSA delivers the waybill PDF inline on the create response. Expose it
    // as pdfLabelUrl so callers can persist the label immediately instead of
    // a follow-up getLabel round-trip (the b2c/c2b query endpoints may not
    // even have indexed a freshly-created AWB yet).
    pdfLabelUrl: firstWaybill?.awbFile
      ? `data:application/pdf;base64,${firstWaybill.awbFile}`
      : undefined,
    returnLabel: firstWaybill?.returnBarcode
      ? `data:application/pdf;base64,${firstWaybill.returnBarcode}`
      : undefined,
    // Guard a missing createDate so we never build `new Date("undefined+03:00")`
    // (Invalid Date). Append the SMSA timezone (+03:00) only to bare timestamps.
    createdAt: data.createDate
      ? new Date(
          /[Z]$|[+-]\d{2}(:\d{2})?$/.test(data.createDate)
            ? data.createDate
            : `${data.createDate}+03:00`,
        )
      : new Date(),
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
  // Real API records (freshly-booked AWB, partial bulk record) may omit Scans
  // entirely; default to [] so a scan-less record yields "unknown" instead of
  // throwing (and failing the whole trackMultiple batch).
  const scans = data.Scans ?? [];
  const { status, statusLabel } = deriveStatusFromScans(scans, data.isDelivered);

  const deliveredScan = scans.find((s) => s.ScanType === "DL");
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
    events: scans.map(mapTrackingEvent),
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

  const consigneeAddress = mapAddress(input.consignee, {
    includeShortCode: true,
  });
  if (input.options?.metadata?.consigneeId) {
    consigneeAddress.ConsigneeID = input.options.metadata.consigneeId as string;
  }

  return {
    ConsigneeAddress: consigneeAddress,
    ShipperAddress: mapAddress(input.shipper),
    OrderNumber: input.reference ?? generateOrderNumber(),
    DeclaredValue: input.declaredValue?.amount ?? 0,
    ContentDescription: input.parcels[0]?.description ?? "Shipment contents",
    Parcels: totalPieces,
    // SMSA reads bare timestamps as Saudi local time (UTC+3), so send the
    // UTC+3 wall-clock rather than zero-offset UTC.
    ShipDate: smsaShipDate(),
    ShipmentCurrency: input.declaredValue?.currency ?? "SAR",
    Weight: roundWeight(totalWeight),
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

/**
 * Timing-safe string comparison to prevent timing attacks on auth tokens.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  let mismatch = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    mismatch |= bufA[i]! ^ bufB[i]!;
  }
  return mismatch === 0;
}

function verifyWebhookAuth(options?: {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  config?: WebhookConfig;
}): void {
  const { headers = {}, queryParams = {}, config } = options ?? {};

  // Verify auth via header (case-insensitive lookup, timing-safe comparison)
  if (config?.authHeader && config?.authValue) {
    const lowerKey = config.authHeader.toLowerCase();
    const headerValue = Object.entries(headers).find(
      ([k]) => k.toLowerCase() === lowerKey,
    )?.[1];
    if (!headerValue || !timingSafeEqual(headerValue, config.authValue)) {
      throw new WebhookVerificationError("Invalid webhook auth header", {
        carrier: "smsaexpress",
      });
    }
  }

  // Verify auth via query param (SMSA uses API key as query param, timing-safe)
  if (config?.authQueryParam && config?.authQueryValue) {
    const paramValue = queryParams[config.authQueryParam];
    if (!paramValue || !timingSafeEqual(paramValue, config.authQueryValue)) {
      throw new WebhookVerificationError("Invalid webhook auth query param", {
        carrier: "smsaexpress",
      });
    }
  }
}

function mapWebhookShipmentToEvent(
  shipment: SMSAWebhookShipment,
): WebhookEvent {
  // A webhook record may arrive without Scans; default to [] so a scan-less
  // shipment yields "unknown" instead of throwing.
  const scans = shipment.Scans ?? [];
  const { status, statusLabel } = deriveStatusFromScans(
    scans,
    shipment.isDelivered,
  );

  // Sort scans descending (zone-adjusted) to get the latest one for
  // timestamp/statusCode.
  const sorted = [...scans].sort(
    (a, b) => scanTimestampMs(b) - scanTimestampMs(a),
  );
  const latestScan = sorted[0];
  const timestamp = latestScan ? scanDate(latestScan) : new Date();

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

/**
 * Map a webhook shipment to one WebhookEvent PER scan, in chronological
 * (oldest → newest) order.
 *
 * SMSA can report several new scans for the same shipment in a single
 * webhook call (e.g. AF, OD, DL all at once). Collapsing that into only the
 * latest scan silently drops intermediate transitions/history, so this
 * expands every scan into its own event.
 */
function mapWebhookShipmentToEvents(
  shipment: SMSAWebhookShipment,
): WebhookEvent[] {
  const scans = shipment.Scans ?? [];

  if (scans.length === 0) {
    // No scans to expand — fall back to the single derived (possibly
    // "unknown"/isDelivered-driven) event.
    return [mapWebhookShipmentToEvent(shipment)];
  }

  const sorted = [...scans].sort(
    (a, b) => scanTimestampMs(a) - scanTimestampMs(b),
  );

  return sorted.map((scan, index) => {
    // Only the chronologically-last scan can be elevated to "delivered" by
    // the isDelivered flag; earlier scans reflect their own scan type.
    const isLatest = index === sorted.length - 1;
    const status: ShipmentStatus =
      isLatest && shipment.isDelivered
        ? "delivered"
        : mapSMSAStatus(scan.ScanType);

    return {
      carrier: "smsaexpress",
      eventType: "status_update",
      trackingNumber: shipment.AWB,
      reference: shipment.Reference || undefined,
      status,
      statusCode: scan.ScanType,
      statusLabel: scan.ScanDescription,
      timestamp: scanDate(scan),
      raw: shipment,
    };
  });
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
    // Only AWB is truly required (it becomes the event's trackingNumber). Scans
    // may be absent on a freshly-booked record — every mapper defends with
    // `Scans ?? []` and yields an "unknown" status — so requiring it here would
    // wrongly reject valid scan-less webhooks.
    if (!item || typeof item !== "object" || !("AWB" in item)) {
      throw new ValidationError(
        "Invalid SMSA webhook payload: shipment missing required field (AWB)",
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
 * scan of every shipment in the batch (in chronological order per shipment).
 *
 * SMSA sends webhook payloads as an array of shipments, each with their own
 * tracking scans, and a single call can carry multiple new scans for the
 * same shipment (e.g. AF, OD, DL together) — each becomes its own event so
 * no intermediate transition/history is dropped.
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
  return shipments.flatMap(mapWebhookShipmentToEvents);
}
