// file: src/carriers/smsaexpress/adapter.ts
/**
 * SMSA Express Carrier Adapter
 * Full implementation of the CarrierAdapter interface for SMSA Express API.
 */

import { APIError } from "../../core/errors";
import { HttpClient } from "../../core/http";
import type {
  CarrierConfig,
  City,
  CreateShipmentInput,
  Location,
  Shipment,
  TrackingResult,
  WebhookConfig,
  WebhookEvent,
} from "../../core/types";
import { BaseCarrierAdapter } from "../base";
import {
  mapCity,
  mapCreate2WayRequest,
  mapCreateB2CRequest,
  mapCreateC2BRequest,
  mapOffice,
  mapShipmentResponse,
  mapTrackingResult,
  parseSMSAWebhook,
  parseSMSAWebhookBatch,
} from "./mappers";
import type {
  SMSACityLookupItem,
  SMSAOfficeLookupItem,
  SMSAPushIdDetailsRequest,
  SMSAPushIdDetailsResponse,
  SMSASendInvoiceRequest,
  SMSAShipmentResponse,
  SMSAShortAddressResponse,
  SMSATrackingResponse,
} from "./types";

const SMSA_SANDBOX_URL = "https://ecomapis-sandbox.azurewebsites.net";
const SMSA_PRODUCTION_URL = "https://ecomapis.smsaexpress.com";

/** Reverse-pickup / C2B service codes */
const C2B_SERVICE_CODES = new Set(["EDCR"]);

export interface SMSAExpressConfig extends CarrierConfig {
  credentials: {
    apiKey: string;
  };
}

export class SMSAExpressAdapter extends BaseCarrierAdapter {
  readonly name = "smsaexpress";
  readonly supportedCountries = [
    "SA",
    "AE",
    "BH",
    "EG",
    "KW",
    "OM",
    "QA",
    "JO",
  ];

  private http: HttpClient;

  constructor(config: SMSAExpressConfig) {
    super(config);
    this.http = new HttpClient({
      baseUrl: this.getBaseUrl(),
      carrier: "smsaexpress",
      headers: {
        apikey: config.credentials.apiKey,
      },
    });
  }

  protected getBaseUrl(): string {
    return this.config.mode === "production"
      ? SMSA_PRODUCTION_URL
      : SMSA_SANDBOX_URL;
  }

  // =========================================================================
  // SHIPPING
  // =========================================================================

  protected async executeCreateShipment(
    input: CreateShipmentInput,
  ): Promise<Shipment> {
    const isC2B =
      input.serviceType !== undefined &&
      C2B_SERVICE_CODES.has(input.serviceType);

    if (isC2B) {
      return this.createC2BShipment(input);
    }

    const request = mapCreateB2CRequest(input);
    const response = await this.http.post<SMSAShipmentResponse>(
      "/api/shipment/b2c/new",
      request,
    );

    return mapShipmentResponse(response, input);
  }

  private async createC2BShipment(
    input: CreateShipmentInput,
  ): Promise<Shipment> {
    const request = mapCreateC2BRequest(input);
    const response = await this.http.post<SMSAShipmentResponse>(
      "/api/c2b/new",
      request,
    );

    return mapShipmentResponse(response, input);
  }

  /**
   * Cancel a reverse-pickup (C2B) shipment.
   *
   * **Important:** SMSA only supports cancellation for C2B/reverse-pickup shipments.
   * Calling this on a B2C shipment will result in an API error or return `false`.
   * B2C shipments cannot be cancelled via the SMSA API.
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    const response = await this.http.post<string>(
      `/api/c2b/cancel/${encodeURIComponent(trackingNumber)}`,
    );
    // API returns a plain-text message on success (e.g. "Shipment Cancelled
    // Successfully!"); inspect it for confirmation. A non-string (JSON) success
    // response is treated as success.
    return typeof response === "string"
      ? response.toLowerCase().includes("cancelled")
      : true;
  }

  // =========================================================================
  // TRACKING
  // =========================================================================

  async track(trackingNumber: string): Promise<TrackingResult> {
    const response = await this.http.get<SMSATrackingResponse>(
      `/api/track/single/${encodeURIComponent(trackingNumber)}`,
    );

    return mapTrackingResult(response);
  }

  async trackMultiple(trackingNumbers: string[]): Promise<TrackingResult[]> {
    const response = await this.http.post<SMSATrackingResponse[]>(
      "/api/track/bulk/",
      trackingNumbers,
      { retry: true },
    );

    return response.map(mapTrackingResult);
  }

  async trackByReference(reference: string): Promise<TrackingResult> {
    const response = await this.http.get<SMSATrackingResponse>(
      `/api/track/reference/${encodeURIComponent(reference)}`,
    );

    return mapTrackingResult(response);
  }

  // =========================================================================
  // LABELS
  // =========================================================================

  async getLabel(
    trackingNumber: string,
    _format?: "PDF" | "ZPL" | "PNG",
  ): Promise<string> {
    // SMSA returns the waybill file (base64 PDF) as part of the shipment query.
    // Try B2C first (most common), then C2B as fallback.
    const encoded = encodeURIComponent(trackingNumber);

    for (const path of [
      `/api/shipment/b2c/query/${encoded}`,
      `/api/c2b/query/${encoded}`,
    ]) {
      try {
        const response = await this.http.get<SMSAShipmentResponse>(path);
        const waybill = response.waybills?.[0];
        if (waybill?.awbFile) {
          return `data:application/pdf;base64,${waybill.awbFile}`;
        }
      } catch (error) {
        // Only swallow 4xx API errors (shipment type mismatch / not found).
        // Re-throw auth, network, server, and unexpected errors immediately.
        if (
          !(error instanceof APIError) ||
          error.statusCode === 401 ||
          (error.statusCode !== undefined && error.statusCode >= 500)
        ) {
          throw error;
        }
      }
    }

    throw new APIError("No label found for shipment", {
      carrier: "smsaexpress",
      raw: { trackingNumber },
    });
  }

  // =========================================================================
  // CITIES & LOCATIONS
  // =========================================================================

  async getCities(countryCode = "SA"): Promise<City[]> {
    const response = await this.http.get<SMSACityLookupItem[]>(
      `/api/lookup/cities/${encodeURIComponent(countryCode)}`,
    );

    return response.map(mapCity);
  }

  async getDropoffLocations(): Promise<Location[]> {
    const response = await this.http.get<SMSAOfficeLookupItem[]>(
      "/api/lookup/smsaoffices",
    );

    return response.map(mapOffice);
  }

  // =========================================================================
  // 2-WAY SHIPMENT
  // =========================================================================

  async create2WayShipment(input: CreateShipmentInput): Promise<Shipment> {
    const request = mapCreate2WayRequest(input);
    const response = await this.http.post<SMSAShipmentResponse>(
      "/api/TwoWayShipment/new",
      request,
    );

    return mapShipmentResponse(response, input);
  }

  // =========================================================================
  // INVOICE & ID OPERATIONS (SMSA-specific)
  // =========================================================================

  async sendInvoice(request: SMSASendInvoiceRequest): Promise<string> {
    return this.http.post<string>("/api/invoice", request);
  }

  async validateShortAddress(
    shortCode: string,
  ): Promise<SMSAShortAddressResponse> {
    return this.http.get<SMSAShortAddressResponse>(
      `/api/Lookup/FullAddressByShortCode/${encodeURIComponent(shortCode)}`,
    );
  }

  async pushIdDetails(
    request: SMSAPushIdDetailsRequest,
  ): Promise<SMSAPushIdDetailsResponse> {
    return this.http.post<SMSAPushIdDetailsResponse>(
      "/api/shipment/identity-details",
      request,
    );
  }

  // =========================================================================
  // WEBHOOKS
  // =========================================================================

  parseWebhook(
    payload: unknown,
    options?: {
      headers?: Record<string, string>;
      queryParams?: Record<string, string>;
      config?: WebhookConfig;
    },
  ): WebhookEvent {
    return parseSMSAWebhook(payload, options);
  }

  /**
   * Parse a batch SMSA webhook payload into multiple events.
   *
   * SMSA sends webhook payloads as an array of shipments, each with their own
   * tracking scans. This method returns a WebhookEvent for every shipment
   * in the payload.
   */
  parseWebhookBatch(
    payload: unknown,
    options?: {
      headers?: Record<string, string>;
      queryParams?: Record<string, string>;
      config?: WebhookConfig;
    },
  ): WebhookEvent[] {
    return parseSMSAWebhookBatch(payload, options);
  }
}
