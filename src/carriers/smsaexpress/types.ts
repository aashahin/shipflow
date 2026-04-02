// file: src/carriers/smsaexpress/types.ts
/**
 * SMSA Express Raw API Types
 * These directly mirror the SMSA Express API request/response formats.
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface SMSAShipmentAddress {
  AddressLine1: string;
  AddressLine2?: string;
  City: string;
  ConsigneeID?: string;
  ContactName: string;
  ContactPhoneNumber: string;
  Coordinates?: string;
  Country: string;
  District?: string;
  PostalCode?: string;
  ShortCode?: string;
}

export interface SMSACreateB2CShipmentRequest {
  CODAmount: number;
  ConsigneeAddress: SMSAShipmentAddress;
  ContentDescription: string;
  DeclaredValue: number;
  DutyPaid?: boolean;
  OrderNumber: string;
  Parcels: number;
  ServiceCode?: string;
  ShipDate: string;
  ShipmentCurrency: string;
  ShipperAddress: SMSAShipmentAddress;
  SMSARetailID?: string;
  VatPaid?: boolean;
  WaybillType?: "PDF" | "ZPL";
  Weight: number;
  WeightUnit: "KG" | "LB";
}

export interface SMSACreateC2BShipmentRequest {
  ContentDescription: string;
  DeclaredValue: number;
  OrderNumber: string;
  Parcels: number;
  PickupAddress: SMSAShipmentAddress;
  ReturnToAddress: SMSAShipmentAddress;
  ServiceCode?: string;
  ShipDate: string;
  ShipmentCurrency: string;
  SMSARetailID?: string;
  WaybillType?: "PDF" | "ZPL";
  Weight: number;
  WeightUnit: "KG" | "LB";
}

export interface SMSACreate2WayShipmentRequest {
  ConsigneeAddress: SMSAShipmentAddress;
  ContentDescription: string;
  DeclaredValue: number;
  DutyPaid?: boolean;
  OrderNumber: string;
  Parcels: number;
  ShipDate: string;
  ShipmentCurrency: string;
  ShipperAddress: SMSAShipmentAddress;
  SMSARetailID?: string;
  VatPaid?: boolean;
  WaybillType?: "PDF" | "ZPL";
  Weight: number;
  WeightUnit: "KG" | "LB";
}

export interface SMSAInvoiceItem {
  CountryOfOrigin?: string;
  ItemDescription: string;
  ItemHSCode: string;
  ItemReference: string;
  ItemValue: number;
  Quantity: number;
  QuantityUnit: string;
  sequence: number;
  Weight: number;
}

export interface SMSASendInvoiceRequest {
  AWB: string;
  Currency: string;
  InvoiceDate: string;
  Items: SMSAInvoiceItem[];
  WeightUnit: "KG" | "LB";
}

export interface SMSAPushIdDetailsRequest {
  awb: string;
  birthDate: string;
  documentType: "PASSPORT" | "ID_CARD" | "RESIDENCE_PERMIT";
  idName: string;
  idNumber: string;
  issueDate: string;
  nationality: string;
  shipmentReference?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SMSAWaybill {
  awb: string;
  awbFile: string;
  returnBarcode?: string;
}

export interface SMSAShipmentResponse {
  sawb: string;
  createDate: string;
  shipmentParcelsCount: number;
  waybills: SMSAWaybill[];
}

export interface SMSATrackingScan {
  ReceivedBy?: string;
  City: string;
  ScanType: string;
  ScanDescription: string;
  ScanDateTime: string;
  ScanTimeZone: string;
}

export interface SMSATrackingResponse {
  AWB: string;
  Reference: string;
  Pieces: number;
  CODAmount: number;
  ContentDesc: string;
  RecipientName: string;
  OriginCity: string;
  OriginCountry: string;
  DesinationCity: string; // [sic] SMSA API typo for "DestinationCity"
  DesinationCountry: string; // [sic] SMSA API typo for "DestinationCountry"
  isDelivered?: boolean;
  Scans: SMSATrackingScan[];
}

export interface SMSAStatusLookupItem {
  Code: string;
  ScanDescEN: string;
  ScanDescAR: string;
}

export interface SMSACityLookupItem {
  cityName: string;
  cityCode: string;
  countryCode: string;
  currencyCode: string;
  currencyName: string;
}

export interface SMSACountryCurrencyItem {
  countryName: string;
  countryCode: string;
  currency: string;
  currencyCode: string;
}

export interface SMSAOfficeLookupItem {
  code: string;
  address: string;
  cityName: string;
  addressAR: string;
  coordinates: string;
  firstShift: string;
  secondShift: string;
  weekendShift: string;
}

export interface SMSAShortAddressResponse {
  address1: string;
  address2: string;
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  postCode: string;
  additionalNumber: string;
  regionName: string;
  latitude: string;
  longitude: string;
}

export interface SMSAPushIdDetailsResponse {
  id: number;
  awb: string;
  message: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

/** SMSA webhook scan includes a ReferenceID field not present in regular tracking scans */
export interface SMSAWebhookScan extends SMSATrackingScan {
  ReferenceID: number;
}

/**
 * SMSA webhook shipment payload.
 * Same structure as SMSATrackingResponse but scans include ReferenceID.
 * SMSA sends an array of these as the webhook payload.
 */
export interface SMSAWebhookShipment {
  AWB: string;
  Reference: string;
  Pieces: number;
  CODAmount: number;
  ContentDesc: string;
  RecipientName: string;
  OriginCity: string;
  OriginCountry: string;
  DesinationCity: string;
  DesinationCountry: string;
  isDelivered?: boolean;
  Scans: SMSAWebhookScan[];
}
