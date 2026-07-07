// file: src/core/schemas.ts
/**
 * Valibot Validation Schemas for ShipFlow SDK
 * Auto-validates inputs at SDK boundaries (createShipment, createPickup, etc.)
 */

import * as v from "valibot";
import { ValidationError } from "./errors";
import type { CreateShipmentInput, PickupRequest } from "./types";

// ============================================================================
// ADDRESS SCHEMAS
// ============================================================================

export const NationalAddressSchema = v.object({
  shortCode: v.pipe(v.string(), v.minLength(1)),
  buildingNumber: v.optional(v.string()),
  streetName: v.optional(v.string()),
  district: v.optional(v.string()),
  additionalNumber: v.optional(v.string()),
});

export const AddressSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  company: v.optional(v.string()),
  email: v.optional(v.pipe(v.string(), v.email("Invalid email format"))),
  phone: v.pipe(v.string(), v.minLength(1, "Phone is required")),
  line1: v.pipe(v.string(), v.minLength(1, "Address line 1 is required")),
  line2: v.optional(v.string()),
  neighbourhood: v.optional(v.string()),
  city: v.pipe(v.string(), v.minLength(1, "City is required")),
  state: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  countryCode: v.pipe(
    v.string(),
    v.length(2, "Country code must be ISO 3166-1 alpha-2 (2 characters)"),
  ),
  coordinates: v.optional(
    v.object({
      latitude: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
      longitude: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
    }),
  ),
  description: v.optional(v.string()),
  nationalAddress: v.optional(NationalAddressSchema),
});

// ============================================================================
// PARCEL SCHEMAS
// ============================================================================

export const WeightSchema = v.object({
  value: v.pipe(v.number(), v.gtValue(0, "Weight must be positive")),
  unit: v.picklist(["kg", "lb"]),
});

export const DimensionsSchema = v.object({
  length: v.pipe(v.number(), v.gtValue(0, "Length must be positive")),
  width: v.pipe(v.number(), v.gtValue(0, "Width must be positive")),
  height: v.pipe(v.number(), v.gtValue(0, "Height must be positive")),
  unit: v.picklist(["cm", "in"]),
});

export const ParcelSchema = v.object({
  weight: WeightSchema,
  dimensions: v.optional(DimensionsSchema),
  pieces: v.pipe(
    v.number(),
    v.integer(),
    v.gtValue(0, "Pieces must be a positive integer"),
  ),
  itemsCount: v.optional(v.pipe(v.number(), v.integer(), v.gtValue(0))),
  description: v.optional(v.string()),
});

// ============================================================================
// SHIPMENT SCHEMAS
// ============================================================================

export const CODDetailsSchema = v.object({
  enabled: v.boolean(),
  amount: v.pipe(v.number(), v.minValue(0, "COD amount must be non-negative")),
  currency: v.pipe(v.string(), v.minLength(1, "COD currency is required")),
});

export const DeclaredValueSchema = v.object({
  amount: v.pipe(v.number(), v.minValue(0, "Declared value must be non-negative")),
  currency: v.pipe(v.string(), v.minLength(1, "Currency is required")),
});

export const InternationalMetadataSchema = v.object({
  taxId: v.optional(v.string()),
  invoiceNumber: v.optional(v.string()),
  invoiceDate: v.optional(v.string()),
  documentId: v.optional(v.number()),
});

export const ShipmentOptionsSchema = v.object({
  requestedBy: v.optional(v.string()),
  isInsured: v.optional(v.boolean()),
  customerTracking: v.optional(v.string()),
  fulfilmentCustomerName: v.optional(v.string()),
  internationalMetadata: v.optional(InternationalMetadataSchema),
  metadata: v.optional(v.record(v.string(), v.unknown())),
});

export const CreateShipmentInputSchema = v.object({
  shipper: AddressSchema,
  consignee: AddressSchema,
  parcels: v.pipe(
    v.array(ParcelSchema),
    v.minLength(1, "At least one parcel is required"),
  ),
  serviceType: v.optional(v.pipe(v.string(), v.minLength(1))),
  reference: v.optional(v.string()),
  cod: v.optional(CODDetailsSchema),
  declaredValue: v.optional(DeclaredValueSchema),
  labelFormat: v.optional(v.picklist(["PDF", "ZPL", "PNG"])),
  options: v.optional(ShipmentOptionsSchema),
});

// ============================================================================
// PICKUP SCHEMAS
// ============================================================================

export const PickupRequestSchema = v.object({
  date: v.pipe(
    v.string(),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  ),
  timeSlot: v.pipe(v.string(), v.minLength(1, "Time slot is required")),
  city: v.pipe(v.string(), v.minLength(1, "City is required")),
  contactName: v.pipe(v.string(), v.minLength(1, "Contact name is required")),
  contactPhone: v.pipe(v.string(), v.minLength(1, "Contact phone is required")),
  address: v.pipe(v.string(), v.minLength(1, "Address is required")),
  shipmentCount: v.pipe(
    v.number(),
    v.integer(),
    v.gtValue(0, "Shipment count must be a positive integer"),
  ),
  trackingNumbers: v.optional(v.array(v.string())),
});

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

export const WebhookConfigSchema = v.object({
  authHeader: v.optional(v.string()),
  authValue: v.optional(v.string()),
  authQueryParam: v.optional(v.string()),
  authQueryValue: v.optional(v.string()),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function formatIssues(
  issues: ReadonlyArray<v.BaseIssue<unknown>>,
): Array<{ path: string; message: string }> {
  return issues.map((issue) => ({
    path: v.getDotPath(issue) ?? "",
    message: issue.message,
  }));
}

export function validateCreateShipmentInput(
  input: CreateShipmentInput,
): CreateShipmentInput {
  const result = v.safeParse(CreateShipmentInputSchema, input);
  if (!result.success) {
    throw new ValidationError("Invalid shipment input", {
      issues: formatIssues(result.issues),
      raw: input,
    });
  }
  return result.output as CreateShipmentInput;
}

export function validatePickupRequest(input: PickupRequest): PickupRequest {
  const result = v.safeParse(PickupRequestSchema, input);
  if (!result.success) {
    throw new ValidationError("Invalid pickup request", {
      issues: formatIssues(result.issues),
      raw: input,
    });
  }
  return result.output as PickupRequest;
}

