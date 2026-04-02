// file: src/carriers/smsaexpress/index.ts
/**
 * SMSA Express Carrier Exports
 * Import from 'shipflow/carriers/smsaexpress' for tree-shaking.
 */

// Adapter
export { SMSAExpressAdapter, type SMSAExpressConfig } from "./adapter";

// Service Types
export { SMSAService, SMSAStatusCodes, type SMSAServiceType } from "./services";

// Mappers (for advanced usage)
export {
  mapSMSAStatus,
  parseSMSAWebhook,
  parseSMSAWebhookBatch,
} from "./mappers";

// Raw Types (for advanced usage)
export type {
  SMSACreate2WayShipmentRequest,
  SMSACreateB2CShipmentRequest,
  SMSACreateC2BShipmentRequest,
  SMSAPushIdDetailsRequest,
  SMSAPushIdDetailsResponse,
  SMSASendInvoiceRequest,
  SMSAShipmentResponse,
  SMSAShortAddressResponse,
  SMSATrackingResponse,
  SMSATrackingScan,
  SMSAWebhookShipment,
} from "./types";
