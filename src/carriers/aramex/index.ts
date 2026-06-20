// file: src/carriers/aramex/index.ts
/**
 * Aramex Carrier Exports
 * Import from 'shipflow/carriers/aramex' for tree-shaking.
 */

// Adapter
export { AramexAdapter, type AramexConfig } from "./adapter";

// Service / Status constants
export {
  AramexProductGroup,
  AramexProductType,
  AramexPaymentType,
  AramexService,
  AramexStatusCodes,
  type AramexProductGroupType,
  type AramexProductTypeCode,
  type AramexPaymentTypeCode,
} from "./services";

// Mappers (for advanced usage)
export {
  buildClientInfo,
  mapAramexStatus,
  statusFromDescription,
  parseAramexDate,
  type AramexCredentials,
} from "./mappers";

// Raw Types (for advanced usage)
export type {
  AramexClientInfo,
  AramexCreateShipmentsRequest,
  AramexCreateShipmentsResponse,
  AramexProcessedShipment,
  AramexShipmentLabel,
  AramexPrintLabelResponse,
  AramexTrackShipmentsRequest,
  AramexTrackShipmentsResponse,
  AramexTrackingResult,
  AramexCalculateRateRequest,
  AramexCalculateRateResponse,
  AramexCreatePickupRequest,
  AramexCreatePickupResponse,
  AramexCancelPickupRequest,
  AramexFetchCitiesResponse,
  AramexFetchOfficesResponse,
} from "./types";
