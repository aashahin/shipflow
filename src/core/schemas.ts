// file: src/core/schemas.ts
/**
 * Zod Validation Schemas for ShipFlow SDK
 * Auto-validates inputs at SDK boundaries (createShipment, createPickup, etc.)
 */

import { z } from "zod";
import { ValidationError } from "./errors";
import type { CreateShipmentInput, PickupRequest } from "./types";

// ============================================================================
// ADDRESS SCHEMAS
// ============================================================================

export const NationalAddressSchema = z.object({
  shortCode: z.string().min(1),
  buildingNumber: z.string().optional(),
  streetName: z.string().optional(),
  district: z.string().optional(),
  additionalNumber: z.string().optional(),
});

export const AddressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().min(1, "Phone is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  neighbourhood: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z
    .string()
    .length(2, "Country code must be ISO 3166-1 alpha-2 (2 characters)"),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  description: z.string().optional(),
  nationalAddress: NationalAddressSchema.optional(),
});

// ============================================================================
// PARCEL SCHEMAS
// ============================================================================

export const WeightSchema = z.object({
  value: z.number().positive("Weight must be positive"),
  unit: z.enum(["kg", "lb"]),
});

export const DimensionsSchema = z.object({
  length: z.number().positive("Length must be positive"),
  width: z.number().positive("Width must be positive"),
  height: z.number().positive("Height must be positive"),
  unit: z.enum(["cm", "in"]),
});

export const ParcelSchema = z.object({
  weight: WeightSchema,
  dimensions: DimensionsSchema.optional(),
  pieces: z.number().int().positive("Pieces must be a positive integer"),
  itemsCount: z.number().int().positive().optional(),
  description: z.string().optional(),
});

// ============================================================================
// SHIPMENT SCHEMAS
// ============================================================================

export const CODDetailsSchema = z.object({
  enabled: z.boolean(),
  amount: z.number().nonnegative("COD amount must be non-negative"),
  currency: z.string().min(1, "COD currency is required"),
});

export const DeclaredValueSchema = z.object({
  amount: z.number().nonnegative("Declared value must be non-negative"),
  currency: z.string().min(1, "Currency is required"),
});

export const InternationalMetadataSchema = z.object({
  taxId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  documentId: z.number().optional(),
});

export const ShipmentOptionsSchema = z.object({
  requestedBy: z.string().optional(),
  isInsured: z.boolean().optional(),
  customerTracking: z.string().optional(),
  fulfilmentCustomerName: z.string().optional(),
  internationalMetadata: InternationalMetadataSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateShipmentInputSchema = z.object({
  shipper: AddressSchema,
  consignee: AddressSchema,
  parcels: z.array(ParcelSchema).min(1, "At least one parcel is required"),
  serviceType: z.string().min(1).optional(),
  reference: z.string().optional(),
  cod: CODDetailsSchema.optional(),
  declaredValue: DeclaredValueSchema.optional(),
  labelFormat: z.enum(["PDF", "ZPL", "PNG"]).optional(),
  options: ShipmentOptionsSchema.optional(),
});

// ============================================================================
// PICKUP SCHEMAS
// ============================================================================

export const PickupRequestSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  timeSlot: z.string().min(1, "Time slot is required"),
  city: z.string().min(1, "City is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactPhone: z.string().min(1, "Contact phone is required"),
  address: z.string().min(1, "Address is required"),
  shipmentCount: z
    .number()
    .int()
    .positive("Shipment count must be a positive integer"),
  trackingNumbers: z.array(z.string()).optional(),
});

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

export const WebhookConfigSchema = z.object({
  authHeader: z.string().optional(),
  authValue: z.string().optional(),
  authQueryParam: z.string().optional(),
  authQueryValue: z.string().optional(),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function formatZodIssues(
  error: z.ZodError,
): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateCreateShipmentInput(
  input: CreateShipmentInput,
): CreateShipmentInput {
  const result = CreateShipmentInputSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid shipment input", {
      issues: formatZodIssues(result.error),
      raw: input,
    });
  }
  return result.data as CreateShipmentInput;
}

export function validatePickupRequest(input: PickupRequest): PickupRequest {
  const result = PickupRequestSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid pickup request", {
      issues: formatZodIssues(result.error),
      raw: input,
    });
  }
  return result.data as PickupRequest;
}
