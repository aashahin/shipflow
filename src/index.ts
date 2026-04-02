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
export { ShipFlow, createShipFlow, type ShipFlowOptions } from './client';

// Core Types
export type {
    Address,
    NationalAddress,
    CustomerAddress,
    Parcel,
    Weight,
    Dimensions,
    CODDetails,
    DeclaredValue,
    CreateShipmentInput,
    Shipment,
    ShipmentStatus,
    ShipmentOptions,
    InternationalMetadata,
    TrackingEvent,
    TrackingResult,
    PickupRequest,
    Pickup,
    TimeSlot,
    City,
    Location,
    WebhookEvent,
    WebhookEventType,
    WebhookConfig,
    Rate,
    CarrierConfig,
    CarrierCredentials,
} from './core/types';

// Errors
export {
    ShipFlowError,
    NetworkError,
    APIError,
    ValidationError,
    AuthenticationError,
    WebhookVerificationError,
    UnsupportedOperationError,
} from './core/errors';

// Base Adapter (for custom implementations)
export { type CarrierAdapter, BaseCarrierAdapter } from './carriers/base';

// HTTP Client (for custom adapters)
export { HttpClient, type HttpClientConfig, type RequestOptions } from './core/http';
