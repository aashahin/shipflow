// file: src/index.ts
/**
 * ShipFlow - Unified Shipping SDK for MENA Region
 *
 * @example
 * ```typescript
 * import { ShipFlow } from 'shipflow';
 * import { AymakanAdapter, AymakanService } from 'shipflow/carriers/aymakan';
 *
 * const client = new ShipFlow({
 *   adapters: [
 *     new AymakanAdapter({
 *       mode: 'sandbox',
 *       credentials: { apiKey: 'your-api-key' }
 *     })
 *   ]
 * });
 *
 * const shipment = await client.carrier('aymakan').createShipment({...});
 * ```
 */

// Client
export { ShipFlow, createShipFlow, type ShipFlowOptions } from "./client";

// Core Types
export type {
  Address,
  CODDetails,
  CarrierConfig,
  CarrierCredentials,
  City,
  CreateShipmentInput,
  CustomerAddress,
  DeclaredValue,
  Dimensions,
  InternationalMetadata,
  Location,
  NationalAddress,
  Parcel,
  Pickup,
  PickupRequest,
  Rate,
  Shipment,
  ShipmentOptions,
  ShipmentStatus,
  TimeSlot,
  TrackingEvent,
  TrackingResult,
  WebhookConfig,
  WebhookEvent,
  WebhookEventType,
  Weight,
} from "./core/types";

// Errors
export {
  APIError,
  AuthenticationError,
  MalformedResponseError,
  NetworkError,
  RateLimitError,
  ShipFlowError,
  UnsupportedOperationError,
  ValidationError,
  WebhookVerificationError,
} from "./core/errors";

// Validation Schemas
export {
  AddressSchema,
  CODDetailsSchema,
  CreateShipmentInputSchema,
  DeclaredValueSchema,
  DimensionsSchema,
  ParcelSchema,
  PickupRequestSchema,
  WebhookConfigSchema,
  WeightSchema,
  validateCreateShipmentInput,
  validatePickupRequest,
} from "./core/schemas";

// Base Adapter (for custom implementations)
export { BaseCarrierAdapter, type CarrierAdapter } from "./carriers/base";

// HTTP Client (for custom adapters)
export {
  HttpClient,
  type HttpClientConfig,
  type RequestOptions,
} from "./core/http";
