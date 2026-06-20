// file: src/carriers/aramex/mappers.ts
/**
 * Aramex Data Mappers
 * Transform between unified ShipFlow types and the Aramex JSON API formats.
 */

import type {
  Address,
  City,
  CreateShipmentInput,
  Dimensions,
  Location,
  Pickup,
  PickupRequest,
  Rate,
  Shipment,
  ShipmentStatus,
  TrackingEvent,
  TrackingResult,
} from "../../core/types";
import {
  AramexProductType,
  AramexService,
  AramexStatusCodes,
} from "./services";
import type {
  AramexCalculateRateResponse,
  AramexClientInfo,
  AramexContact,
  AramexDimensions,
  AramexMoney,
  AramexOffice,
  AramexParty,
  AramexPartyAddress,
  AramexPickupObject,
  AramexProcessedPickup,
  AramexProcessedShipment,
  AramexShipment,
  AramexShipmentDetails,
  AramexTrackingResult,
  AramexTrackShipmentsResponse,
  AramexWeight,
} from "./types";

// ============================================================================
// CREDENTIALS / CLIENT INFO
// ============================================================================

export interface AramexCredentials {
  userName: string;
  password: string;
  accountNumber: string;
  accountPin: string;
  accountEntity: string;
  accountCountryCode: string;
}

/** Build the ClientInfo block injected into every Aramex request body. */
export function buildClientInfo(
  credentials: AramexCredentials,
  opts?: { source?: number; version?: string },
): AramexClientInfo {
  return {
    UserName: credentials.userName,
    Password: credentials.password,
    Version: opts?.version ?? "v1.0",
    AccountNumber: credentials.accountNumber,
    AccountPin: credentials.accountPin,
    AccountEntity: credentials.accountEntity,
    AccountCountryCode: credentials.accountCountryCode,
    Source: opts?.source ?? 24,
  };
}

// ============================================================================
// STATUS MAPPING
// ============================================================================

export function mapAramexStatus(
  updateCode: string,
): ShipmentStatus | undefined {
  const mapped = AramexStatusCodes[updateCode as keyof typeof AramexStatusCodes];
  return mapped as ShipmentStatus | undefined;
}

/**
 * Secondary heuristic: derive a status from the human-readable update text when
 * the `UpdateCode` isn't in our table (Aramex codes vary by region). Ordered so
 * the more specific phrases win (e.g. "out for delivery" before "delivered").
 */
export function statusFromDescription(
  description: string | undefined,
): ShipmentStatus | undefined {
  if (!description) return undefined;
  const d = description.toLowerCase();
  if (/out for delivery|on delivery|with delivery courier/.test(d))
    return "out_for_delivery";
  // Failure phrases must be checked before the generic "deliver" match, so
  // "delivery failed" / "undeliverable" aren't mistaken for a delivery.
  if (/fail|unable|undeliver|exception|held|on hold|problem|refused|damaged/.test(d))
    return "exception";
  if (/deliver/.test(d)) return "delivered";
  if (/return/.test(d)) return "returned";
  if (/cancel/.test(d)) return "cancelled";
  if (/picked up|collected|pickup/.test(d)) return "picked_up";
  if (/transit|departed|forwarded|en route/.test(d)) return "in_transit";
  if (/received at|arrived|facility|warehouse|sorting|hub/.test(d))
    return "at_warehouse";
  if (/created|information received|booked/.test(d)) return "created";
  return undefined;
}

// ============================================================================
// DATES (WCF /Date(ms)/ format)
// ============================================================================

/** Parse an Aramex WCF date (`/Date(1609459200000+0300)/`) or ISO string. */
export function parseAramexDate(value: string | null | undefined): Date {
  if (!value) return new Date(Number.NaN);
  const wcf = /\/Date\((-?\d+)(?:[+-]\d{4})?\)\//.exec(value);
  if (wcf?.[1]) return new Date(Number.parseInt(wcf[1], 10));
  return new Date(value);
}

function toWcfDate(date: Date): string {
  return `/Date(${date.getTime()})/`;
}

// ============================================================================
// HELPERS
// ============================================================================

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const VALID_PRODUCT_TYPES = new Set(
  Object.values(AramexProductType) as string[],
);

function getMeta(
  input: CreateShipmentInput,
  key: string,
): string | undefined {
  const value = input.options?.metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Resolve ProductGroup (DOM/EXP) and ProductType. Defaults to domestic when
 * shipper and consignee share a country, else express. Overridable via
 * `serviceType` (a valid Aramex product code) or `options.metadata`.
 */
export function resolveProductGroupAndType(input: CreateShipmentInput): {
  productGroup: "EXP" | "DOM";
  productType: string;
} {
  const sameCountry =
    input.shipper.countryCode.trim().toUpperCase() ===
    input.consignee.countryCode.trim().toUpperCase();

  const metaGroup = getMeta(input, "productGroup")?.toUpperCase();
  const productGroup: "EXP" | "DOM" =
    metaGroup === "EXP" || metaGroup === "DOM"
      ? metaGroup
      : sameCountry
        ? "DOM"
        : "EXP";

  const candidate = getMeta(input, "productType") ?? input.serviceType;
  const productType =
    candidate && VALID_PRODUCT_TYPES.has(candidate)
      ? candidate
      : productGroup === "DOM"
        ? AramexProductType.DOMESTIC
        : AramexProductType.ECONOMY_PARCEL_EXPRESS;

  return { productGroup, productType };
}

function resolvePaymentType(input: CreateShipmentInput): "P" | "C" | "3" {
  const meta = getMeta(input, "paymentType");
  if (meta === "P" || meta === "C" || meta === "3") return meta;
  return input.cod?.enabled ? "C" : "P";
}

/** Aggregate parcel weights; preserve the unit when uniform, else normalize to kg. */
function aggregateWeight(input: CreateShipmentInput): AramexWeight {
  const allLb = input.parcels.every((p) => p.weight.unit === "lb");
  if (allLb) {
    const value = input.parcels.reduce((s, p) => s + p.weight.value, 0);
    return { Value: round(value), Unit: "Lb" };
  }
  const value = input.parcels.reduce(
    (s, p) =>
      s + (p.weight.unit === "lb" ? p.weight.value * 0.453592 : p.weight.value),
    0,
  );
  return { Value: round(value), Unit: "Kg" };
}

function mapDimensions(dims?: Dimensions): AramexDimensions | null {
  if (!dims) return null;
  const factor = dims.unit === "in" ? 2.54 : 1;
  return {
    Length: round(dims.length * factor),
    Width: round(dims.width * factor),
    Height: round(dims.height * factor),
    Unit: "CM",
  };
}

function mapAddress(addr: Address): AramexPartyAddress {
  // Aramex's WCF `Address` contract marks Line2, Line3 and PostCode as REQUIRED
  // members — omitting them fails deserialization ("required data members
  // 'Line2, Line3, PostCode' were not found"). Always send them (empty if unset).
  return {
    Line1: addr.line1,
    Line2: addr.line2 ?? "",
    Line3: addr.neighbourhood ?? "",
    City: addr.city,
    StateOrProvinceCode: addr.state,
    PostCode: addr.postalCode ?? "",
    CountryCode: addr.countryCode,
    // Coordinates are optional in the contract; omit when unset so Aramex
    // doesn't treat a 0,0 default as a real location.
    Longitude: addr.coordinates?.longitude,
    Latitude: addr.coordinates?.latitude,
  };
}

/**
 * Build an Aramex `Contact`. Aramex's WCF Contact contract marks its string
 * members as REQUIRED (the same pattern confirmed live for Address and
 * Transaction — an empty value fails deserialization, an empty string is
 * accepted), so every member is sent, defaulting to "".
 */
function buildContact(opts: {
  personName: string;
  companyName: string;
  phone: string;
  email?: string;
}): AramexContact {
  return {
    Department: "",
    PersonName: opts.personName,
    Title: "",
    CompanyName: opts.companyName,
    PhoneNumber1: opts.phone,
    PhoneNumber1Ext: "",
    PhoneNumber2: "",
    CellPhone: opts.phone,
    EmailAddress: opts.email ?? "",
    Type: "",
  };
}

function mapContact(addr: Address, fallbackCompany?: string): AramexContact {
  return buildContact({
    personName: addr.name,
    companyName: addr.company ?? fallbackCompany ?? addr.name,
    phone: addr.phone,
    email: addr.email,
  });
}

function mapParty(
  addr: Address,
  accountNumber?: string,
  fallbackCompany?: string,
): AramexParty {
  return {
    AccountNumber: accountNumber,
    PartyAddress: mapAddress(addr),
    Contact: mapContact(addr, fallbackCompany),
  };
}

/** Shared between CreateShipments and CalculateRate. */
function mapShipmentDetails(
  input: CreateShipmentInput,
  productGroup: "EXP" | "DOM",
  productType: string,
  paymentType: "P" | "C" | "3",
): AramexShipmentDetails {
  const numberOfPieces =
    input.parcels.reduce((s, p) => s + p.pieces, 0) || 1;
  const description =
    input.parcels
      .map((p) => p.description)
      .filter(Boolean)
      .join(", ") || "Goods";

  const services: string[] = [];
  let cashOnDelivery: AramexMoney | null = null;
  if (input.cod?.enabled) {
    // Use the caller-supplied COD currency — never hardcode.
    cashOnDelivery = {
      Value: input.cod.amount,
      CurrencyCode: input.cod.currency,
    };
    services.push(AramexService.COD);
  }

  const customsValue: AramexMoney | null = input.declaredValue
    ? {
        Value: input.declaredValue.amount,
        CurrencyCode: input.declaredValue.currency,
      }
    : null;

  // Insurance (INSR) must be accompanied by an amount to insure. Aramex rejects
  // the service with a null InsuranceAmount, so only request it when a declared
  // value is present to base the insured amount on.
  const insuranceAmount: AramexMoney | null =
    input.options?.isInsured && customsValue ? customsValue : null;
  if (insuranceAmount) services.push(AramexService.INSURANCE);

  return {
    Dimensions: mapDimensions(input.parcels[0]?.dimensions),
    ActualWeight: aggregateWeight(input),
    ChargeableWeight: null,
    DescriptionOfGoods: description,
    GoodsOriginCountry: input.shipper.countryCode,
    NumberOfPieces: numberOfPieces,
    ProductGroup: productGroup,
    ProductType: productType,
    PaymentType: paymentType,
    PaymentOptions: "",
    CustomsValueAmount: customsValue,
    CashOnDeliveryAmount: cashOnDelivery,
    InsuranceAmount: insuranceAmount,
    Services: services.join(",") || undefined,
  };
}

// ============================================================================
// REQUEST MAPPERS
// ============================================================================

export interface AramexShipmentContext {
  accountNumber: string;
  companyName?: string;
}

export function mapCreateShipmentRequest(
  input: CreateShipmentInput,
  ctx: AramexShipmentContext,
): AramexShipment {
  const { productGroup, productType } = resolveProductGroupAndType(input);
  const paymentType = resolvePaymentType(input);
  const now = new Date();
  const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    Reference1: input.reference,
    Reference2: input.options?.customerTracking,
    Shipper: mapParty(input.shipper, ctx.accountNumber, ctx.companyName),
    Consignee: mapParty(input.consignee),
    ThirdParty: null,
    ShippingDateTime: toWcfDate(now),
    DueDate: toWcfDate(due),
    Comments: getMeta(input, "comments"),
    PickupLocation: getMeta(input, "pickupLocation"),
    Details: mapShipmentDetails(input, productGroup, productType, paymentType),
    Attachments: null,
    ForeignHAWB: null,
    TransportType: 0,
    Number: null,
  };
}

export function mapCalculateRateRequest(
  input: CreateShipmentInput,
  preferredCurrency?: string,
): {
  OriginAddress: AramexPartyAddress;
  DestinationAddress: AramexPartyAddress;
  ShipmentDetails: AramexShipmentDetails;
  PreferredCurrencyCode?: string;
} {
  const { productGroup, productType } = resolveProductGroupAndType(input);
  const paymentType = resolvePaymentType(input);
  return {
    OriginAddress: mapAddress(input.shipper),
    DestinationAddress: mapAddress(input.consignee),
    ShipmentDetails: mapShipmentDetails(
      input,
      productGroup,
      productType,
      paymentType,
    ),
    PreferredCurrencyCode:
      preferredCurrency ??
      input.cod?.currency ??
      input.declaredValue?.currency,
  };
}

export interface AramexPickupContext {
  accountNumber: string;
  countryCode: string;
  companyName?: string;
}

export function mapPickupRequest(
  input: PickupRequest,
  ctx: AramexPickupContext,
): AramexPickupObject {
  const pickupDate = new Date(`${input.date}T00:00:00`);
  const ready = new Date(`${input.date}T09:00:00`);
  const closing = new Date(`${input.date}T17:00:00`);

  return {
    Reference1: input.trackingNumbers?.[0],
    PickupAddress: {
      Line1: input.address,
      City: input.city,
      CountryCode: ctx.countryCode,
    },
    PickupContact: buildContact({
      personName: input.contactName,
      companyName: ctx.companyName ?? input.contactName,
      phone: input.contactPhone,
    }),
    PickupLocation: "Reception",
    PickupDate: toWcfDate(pickupDate),
    ReadyTime: toWcfDate(ready),
    LastPickupTime: toWcfDate(closing),
    ClosingTime: toWcfDate(closing),
    Comments: input.timeSlot,
    Status: "Ready",
    PickupItems: {
      PickupItemDetail: [
        {
          ProductGroup: "DOM",
          ProductType: AramexProductType.DOMESTIC,
          Payment: "P",
          NumberOfShipments: input.shipmentCount,
          NumberOfPieces: input.shipmentCount,
          ShipmentWeight: { Value: 1, Unit: "Kg" },
        },
      ],
    },
  };
}

// ============================================================================
// RESPONSE MAPPERS
// ============================================================================

export function mapShipmentResponse(
  processed: AramexProcessedShipment,
  input?: CreateShipmentInput,
): Shipment {
  const trackingNumber = processed.ID || processed.ShipmentNumber || "";
  const labelUrl = processed.ShipmentLabel?.LabelURL || undefined;

  return {
    carrier: "aramex",
    trackingNumber,
    customerTracking: input?.options?.customerTracking,
    reference: input?.reference,
    // Aramex returns no status code on create — the shipment is freshly created.
    status: "created",
    statusLabel: "Created",
    labelUrl,
    pdfLabelUrl: labelUrl,
    codAmount: input?.cod?.enabled ? input.cod.amount : undefined,
    declaredValue: input?.declaredValue?.amount,
    currency:
      input?.cod?.currency ?? input?.declaredValue?.currency ?? "SAR",
    createdAt: new Date(),
    raw: processed,
  };
}

export function mapTrackingEvent(
  result: AramexTrackingResult,
): TrackingEvent {
  return {
    timestamp: parseAramexDate(result.UpdateDateTime),
    statusCode: result.UpdateCode,
    status:
      mapAramexStatus(result.UpdateCode) ??
      statusFromDescription(result.UpdateDescription) ??
      "unknown",
    description: result.UpdateDescription,
    location: result.UpdateLocation || undefined,
  };
}

export function mapTrackingResult(
  waybill: string,
  results: AramexTrackingResult[],
): TrackingResult {
  const events = results
    .map(mapTrackingEvent)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const latest = events[0];
  const delivered = events.find((e) => e.status === "delivered");

  // Pull a weight from the most recent raw result that reports one.
  const weightStr = [...results]
    .reverse()
    .find((r) => r.GrossWeight)?.GrossWeight;
  const weight = weightStr ? Number.parseFloat(weightStr) : undefined;

  return {
    trackingNumber: waybill,
    carrier: "aramex",
    status: latest?.status ?? "unknown",
    statusLabel: latest?.description ?? "Unknown",
    events,
    deliveryDate: delivered?.timestamp,
    weight: weight != null && !Number.isNaN(weight) ? weight : undefined,
    raw: results,
  };
}

/**
 * Normalize the `TrackingResults` envelope into a plain map. The WCF JSON
 * serializer renders the dictionary as `[{ Key, Value }]`, but some gateways
 * return a plain object map instead — accept both.
 */
export function normalizeTrackingResults(
  raw: AramexTrackShipmentsResponse["TrackingResults"],
): Record<string, AramexTrackingResult[]> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const map: Record<string, AramexTrackingResult[]> = {};
    for (const kv of raw) {
      if (kv && typeof kv === "object" && "Key" in kv) {
        map[kv.Key] = kv.Value ?? [];
      }
    }
    return map;
  }
  return raw;
}

export function mapRate(
  response: AramexCalculateRateResponse,
  input: CreateShipmentInput,
): Rate {
  const { productType } = resolveProductGroupAndType(input);
  return {
    carrier: "aramex",
    serviceType: productType,
    serviceName: productType,
    amount: response.TotalAmount?.Value ?? 0,
    currency:
      response.TotalAmount?.CurrencyCode ??
      input.cod?.currency ??
      input.declaredValue?.currency ??
      "SAR",
    raw: response,
  };
}

export function mapPickupResponse(
  processed: AramexProcessedPickup,
  input: PickupRequest,
): Pickup {
  return {
    id: processed.GUID || processed.ID,
    carrier: "aramex",
    status: "pending",
    date: input.date,
    timeSlot: input.timeSlot,
    city: input.city,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    address: input.address,
    shipmentCount: input.shipmentCount,
    createdAt: new Date(),
    raw: processed,
  };
}

export function mapCity(name: string): City {
  return { nameEn: name };
}

export function mapOffice(office: AramexOffice): Location {
  const addr = office.Address;
  const lines = [addr?.Line1, addr?.Line2, addr?.Line3].filter(Boolean);
  return {
    id: office.EntityCode,
    name: office.EntityName ?? office.EntityCode,
    address: lines.length ? lines.join(", ") : undefined,
    city: addr?.City,
    latitude: addr?.Latitude,
    longitude: addr?.Longitude,
  };
}
