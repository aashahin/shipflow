// file: src/carriers/aramex/types.ts
/**
 * Aramex Raw API Types
 * These directly mirror the Aramex JSON Shipping Services API v2 request/response
 * formats (PascalCase wire names). Auth is carried by `ClientInfo` in every
 * request body. Errors use the "Fake 200 OK" pattern: HTTP 200 with
 * `HasErrors: true` and a `Notifications` array (both at the envelope level and,
 * for CreateShipments, per-shipment inside `Shipments[]`).
 */

// ============================================================================
// SHARED
// ============================================================================

export interface AramexClientInfo {
  UserName: string;
  Password: string;
  Version: string;
  AccountNumber: string;
  AccountPin: string;
  AccountEntity: string;
  AccountCountryCode: string;
  Source: number;
}

/** Echoed back in every response; all fields optional. */
export interface AramexTransaction {
  Reference1?: string;
  Reference2?: string;
  Reference3?: string;
  Reference4?: string;
  Reference5?: string;
}

export interface AramexMoney {
  Value: number;
  CurrencyCode: string;
}

export interface AramexWeight {
  Value: number;
  Unit: "Kg" | "Lb";
}

export interface AramexDimensions {
  Length: number;
  Width: number;
  Height: number;
  Unit: "CM" | "M";
}

export interface AramexNotification {
  Code: string;
  Message: string;
}

export interface AramexPartyAddress {
  Line1: string;
  Line2?: string;
  Line3?: string;
  City: string;
  StateOrProvinceCode?: string;
  PostCode?: string;
  CountryCode: string;
  Longitude?: number;
  Latitude?: number;
}

export interface AramexContact {
  PersonName: string;
  CompanyName?: string;
  Title?: string;
  PhoneNumber1: string;
  PhoneNumber1Ext?: string;
  PhoneNumber2?: string;
  CellPhone: string;
  EmailAddress?: string;
  Type?: string;
  Department?: string;
}

export interface AramexParty {
  Reference1?: string;
  Reference2?: string;
  AccountNumber?: string;
  PartyAddress: AramexPartyAddress;
  Contact: AramexContact;
}

export interface AramexLabelInfo {
  ReportID: number;
  ReportType: "URL" | "RPT";
}

// ============================================================================
// CREATE SHIPMENTS
// ============================================================================

export interface AramexShipmentDetails {
  Dimensions?: AramexDimensions | null;
  ActualWeight: AramexWeight;
  ChargeableWeight?: AramexWeight | null;
  DescriptionOfGoods: string;
  GoodsOriginCountry: string;
  NumberOfPieces: number;
  ProductGroup: "EXP" | "DOM";
  ProductType: string;
  PaymentType: "P" | "C" | "3";
  PaymentOptions?: string;
  CustomsValueAmount?: AramexMoney | null;
  CashOnDeliveryAmount?: AramexMoney | null;
  InsuranceAmount?: AramexMoney | null;
  CashAdditionalAmount?: AramexMoney | null;
  CashAdditionalAmountDescription?: string;
  CollectAmount?: AramexMoney | null;
  Services?: string;
}

export interface AramexShipment {
  Reference1?: string;
  Reference2?: string;
  Reference3?: string;
  Shipper: AramexParty;
  Consignee: AramexParty;
  ThirdParty?: AramexParty | null;
  ShippingDateTime: string;
  DueDate: string;
  Comments?: string;
  PickupLocation?: string;
  PickupGUID?: string;
  Details: AramexShipmentDetails;
  Attachments?: unknown[] | null;
  ForeignHAWB?: string | null;
  TransportType?: number;
  Number?: string | null;
}

export interface AramexCreateShipmentsRequest {
  ClientInfo: AramexClientInfo;
  Transaction?: AramexTransaction;
  LabelInfo?: AramexLabelInfo | null;
  Shipments: AramexShipment[];
}

export interface AramexShipmentLabel {
  LabelURL?: string;
  LabelFileContents?: string | null;
}

export interface AramexProcessedShipment {
  ID: string;
  ShipmentNumber?: string;
  ForeignHAWB?: string | null;
  HasErrors: boolean;
  Notifications: AramexNotification[];
  ShipmentLabel?: AramexShipmentLabel | null;
  ShipmentDetails?: unknown;
}

export interface AramexCreateShipmentsResponse {
  Transaction?: AramexTransaction;
  Notifications: AramexNotification[];
  HasErrors: boolean;
  Shipments: AramexProcessedShipment[];
}

// ============================================================================
// PRINT LABEL
// ============================================================================

export interface AramexPrintLabelRequest {
  ClientInfo: AramexClientInfo;
  Transaction?: AramexTransaction;
  ShipmentNumber: string;
  ProductGroup?: string;
  OriginEntity?: string;
  LabelInfo: AramexLabelInfo;
}

export interface AramexPrintLabelResponse {
  Transaction?: AramexTransaction;
  Notifications: AramexNotification[];
  HasErrors: boolean;
  ShipmentNumber: string;
  ShipmentLabel: AramexShipmentLabel;
}

// ============================================================================
// TRACK SHIPMENTS
// ============================================================================

export interface AramexTrackShipmentsRequest {
  ClientInfo: AramexClientInfo;
  Transaction?: AramexTransaction;
  Shipments: string[];
  GetLastTrackingUpdateOnly?: boolean;
}

export interface AramexTrackingResult {
  WaybillNumber: string;
  UpdateCode: string;
  UpdateDescription: string;
  UpdateDateTime: string;
  UpdateLocation: string;
  Comments?: string;
  ProblemCode?: string;
  GrossWeight?: string;
  ChargeableWeight?: string;
  WeightUnit?: string;
}

/**
 * The WCF JSON serializer renders `Dictionary<string, TrackingResult[]>` as an
 * array of `{ Key, Value }` pairs. Some gateways/proxies hand back a plain
 * object map instead, so both shapes are accepted and normalized by the mapper.
 */
export interface AramexTrackingKeyValue {
  Key: string;
  Value: AramexTrackingResult[];
}

export interface AramexTrackShipmentsResponse {
  Transaction?: AramexTransaction;
  Notifications: AramexNotification[];
  HasErrors: boolean;
  TrackingResults:
    | AramexTrackingKeyValue[]
    | Record<string, AramexTrackingResult[]>
    | null;
  NonExistingWaybills: string[];
}

// ============================================================================
// CALCULATE RATE
// ============================================================================

export interface AramexCalculateRateRequest {
  ClientInfo: AramexClientInfo;
  Transaction?: AramexTransaction;
  OriginAddress: AramexPartyAddress;
  DestinationAddress: AramexPartyAddress;
  ShipmentDetails: AramexShipmentDetails;
  PreferredCurrencyCode?: string;
}

export interface AramexRateDetails {
  Amount?: number;
  OtherAmount1?: number;
  OtherAmount2?: number;
  OtherAmount3?: number;
  OtherAmount4?: number;
  OtherAmount5?: number;
  TotalAmountBeforeTax?: number;
  TaxAmount?: number;
}

export interface AramexCalculateRateResponse {
  Transaction?: AramexTransaction;
  Notifications: AramexNotification[];
  HasErrors: boolean;
  TotalAmount: AramexMoney;
  RateDetails?: AramexRateDetails;
}

// ============================================================================
// PICKUP
// ============================================================================

export interface AramexPickupItemDetail {
  ProductGroup: string;
  ProductType: string;
  Payment: string;
  NumberOfShipments: number;
  NumberOfPieces: number;
  ShipmentWeight: AramexWeight;
  ShipmentVolume?: AramexWeight | null;
  CashAmount?: AramexMoney | null;
  ExtraCharges?: AramexMoney | null;
  Comments?: string;
}

export interface AramexPickupObject {
  Reference1?: string;
  Reference2?: string;
  PickupAddress: AramexPartyAddress;
  PickupContact: AramexContact;
  PickupLocation: string;
  PickupDate: string;
  ReadyTime: string;
  LastPickupTime: string;
  ClosingTime: string;
  Comments?: string;
  Status: "Ready" | "Pending";
  PickupItems: { PickupItemDetail: AramexPickupItemDetail[] };
}

export interface AramexCreatePickupRequest {
  ClientInfo: AramexClientInfo;
  Transaction?: AramexTransaction;
  Pickup: AramexPickupObject;
  LabelInfo?: AramexLabelInfo | null;
}

export interface AramexProcessedPickup {
  ID: string;
  GUID: string;
  Reference1?: string;
  ProcessedShipments?: AramexProcessedShipment[];
}

export interface AramexCreatePickupResponse {
  Transaction?: AramexTransaction;
  Notifications: AramexNotification[];
  HasErrors: boolean;
  ProcessedPickup: AramexProcessedPickup;
}

export interface AramexCancelPickupRequest {
  ClientInfo: AramexClientInfo;
  Transaction?: AramexTransaction;
  PickupGUID: string;
  Comments?: string;
}

export interface AramexCancelPickupResponse {
  Transaction?: AramexTransaction;
  Notifications: AramexNotification[];
  HasErrors: boolean;
}

// ============================================================================
// LOCATION (FetchCities / FetchOffices)
// ============================================================================

export interface AramexFetchCitiesRequest {
  ClientInfo: AramexClientInfo;
  Transaction?: AramexTransaction;
  CountryCode: string;
  State?: string;
  NameStartsWith?: string;
}

export interface AramexFetchCitiesResponse {
  Transaction?: AramexTransaction;
  Notifications: AramexNotification[];
  HasErrors: boolean;
  /** Plain English city-name strings (no Arabic name, no code). */
  Cities: string[];
}

export interface AramexOffice {
  EntityCode: string;
  EntityName?: string;
  Address: AramexPartyAddress;
}

export interface AramexFetchOfficesRequest {
  ClientInfo: AramexClientInfo;
  Transaction?: AramexTransaction;
  CountryCode: string;
}

export interface AramexFetchOfficesResponse {
  Transaction?: AramexTransaction;
  Notifications: AramexNotification[];
  HasErrors: boolean;
  Offices: AramexOffice[];
}
