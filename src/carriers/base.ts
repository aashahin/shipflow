// file: src/carriers/base.ts
/**
 * CarrierAdapter Interface
 * All carrier implementations must adhere to this interface.
 * Optional methods are marked with `?` for carriers that don't support certain operations.
 */

import { validateCreateShipmentInput } from "../core/schemas";
import type {
  Address,
  CarrierConfig,
  City,
  CreateShipmentInput,
  CustomerAddress,
  Location,
  Pickup,
  PickupRequest,
  Rate,
  Shipment,
  TimeSlot,
  TrackingResult,
  WebhookConfig,
  WebhookEvent,
} from "../core/types";

export interface CarrierAdapter {
  /** Unique carrier identifier (lowercase) */
  readonly name: string;

  /** ISO 3166-1 alpha-2 country codes this carrier operates in */
  readonly supportedCountries: string[];

  // =========================================================================
  // SHIPPING OPERATIONS
  // =========================================================================

  /** Create a single shipment */
  createShipment(input: CreateShipmentInput): Promise<Shipment>;

  /** Create multiple shipments in one request (if supported) */
  createBulkShipments?(inputs: CreateShipmentInput[]): Promise<Shipment[]>;

  /** Cancel a shipment by tracking number */
  cancelShipment(trackingNumber: string): Promise<boolean>;

  /** Cancel a shipment by reference (if supported) */
  cancelByReference?(reference: string): Promise<boolean>;

  /** Update delivery address for an existing shipment */
  updateDeliveryAddress?(
    trackingNumber: string,
    address: Address,
  ): Promise<boolean>;

  // =========================================================================
  // TRACKING OPERATIONS
  // =========================================================================

  /** Track a single shipment */
  track(trackingNumber: string): Promise<TrackingResult>;

  /** Track multiple shipments in one request */
  trackMultiple(trackingNumbers: string[]): Promise<TrackingResult[]>;

  /** Track shipment by reference */
  trackByReference?(reference: string): Promise<TrackingResult>;

  // =========================================================================
  // LABEL OPERATIONS
  // =========================================================================

  /** Get label URL for a shipment */
  getLabel(trackingNumber: string, format?: "PDF" | "PNG"): Promise<string>;

  /** Get bulk labels as single PDF (if supported) */
  getBulkLabels?(trackingNumbers: string[]): Promise<string>;

  // =========================================================================
  // PICKUP OPERATIONS
  // =========================================================================

  /** Get cities available for pickup scheduling */
  getPickupCities?(): Promise<City[]>;

  /** Get available time slots for a city/date */
  getTimeSlots?(city: string, date: string): Promise<TimeSlot[]>;

  /** Schedule a pickup */
  createPickup?(input: PickupRequest): Promise<Pickup>;

  /** Cancel a scheduled pickup */
  cancelPickup?(pickupId: string | number): Promise<boolean>;

  /** Get list of pickup requests */
  getPickupRequests?(): Promise<Pickup[]>;

  // =========================================================================
  // CITIES & LOCATIONS
  // =========================================================================

  /** Get all cities serviced by this carrier */
  getCities?(): Promise<City[]>;

  /** Get dropoff/locker locations */
  getDropoffLocations?(): Promise<Location[]>;

  // =========================================================================
  // CUSTOMER ADDRESSES (Aymakan-specific)
  // =========================================================================

  /** Create a stored customer address */
  createCustomerAddress?(address: CustomerAddress): Promise<CustomerAddress>;

  /** Get all stored customer addresses */
  getCustomerAddresses?(): Promise<CustomerAddress[]>;

  /** Update a stored customer address */
  updateCustomerAddress?(
    id: number,
    address: Partial<CustomerAddress>,
  ): Promise<CustomerAddress>;

  /** Delete a stored customer address */
  deleteCustomerAddress?(id: number): Promise<boolean>;

  // =========================================================================
  // RATES (Future)
  // =========================================================================

  /** Calculate shipping rates */
  getRates?(input: CreateShipmentInput): Promise<Rate[]>;

  // =========================================================================
  // WEBHOOKS
  // =========================================================================

  /** Parse incoming webhook payload into normalized event */
  parseWebhook?(
    payload: unknown,
    options?: {
      headers?: Record<string, string>;
      queryParams?: Record<string, string>;
      config?: WebhookConfig;
    },
  ): WebhookEvent;
}

/**
 * Abstract base class for carrier adapters.
 * Provides common functionality and enforces interface compliance.
 */
export abstract class BaseCarrierAdapter implements CarrierAdapter {
  abstract readonly name: string;
  abstract readonly supportedCountries: string[];

  protected config: CarrierConfig;

  constructor(config: CarrierConfig) {
    this.config = config;
  }

  /** Validates input then delegates to executeCreateShipment() */
  async createShipment(input: CreateShipmentInput): Promise<Shipment> {
    validateCreateShipmentInput(input);
    return this.executeCreateShipment(input);
  }

  protected abstract executeCreateShipment(
    input: CreateShipmentInput,
  ): Promise<Shipment>;
  abstract cancelShipment(trackingNumber: string): Promise<boolean>;
  abstract track(trackingNumber: string): Promise<TrackingResult>;
  abstract trackMultiple(trackingNumbers: string[]): Promise<TrackingResult[]>;
  abstract getLabel(
    trackingNumber: string,
    format?: "PDF" | "PNG",
  ): Promise<string>;

  /** Get base URL based on mode (sandbox/production) */
  protected abstract getBaseUrl(): string;
}
