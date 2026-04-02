// file: src/carriers/aymakan/index.ts
/**
 * Aymakan Carrier Exports
 * Import from 'shipflow/carriers/aymakan' for tree-shaking.
 */

// Adapter
export { AymakanAdapter, type AymakanConfig } from './adapter';

// Service Types
export { AymakanService, AymakanStatusCodes, type AymakanServiceType } from './services';

// Mappers (for advanced usage)
export { parseAymakanWebhook, mapAymakanStatus } from './mappers';

// Raw Types (for advanced usage)
export type {
    AymakanCreateShipmentRequest,
    AymakanShipmentResponse,
    AymakanTrackingEvent,
    AymakanWebhookPayload,
} from './types';
