// file: src/carriers/smsaexpress/adapter.ts
/**
 * SMSA Express Carrier Adapter
 * Full implementation of the CarrierAdapter interface for SMSA Express API.
 */

import {
  CITIES_CACHE_TTL,
  CITIES_FAILURE_COOLDOWN,
  findCityMatch,
} from "../../core/city-resolver";
import {
  APIError,
  MalformedResponseError,
  RateLimitError,
} from "../../core/errors";
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
  generateOrderNumber,
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
  SMSAServiceTypeLookupItem,
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

  /** Cached SMSA Saudi cities list for city validation on booking */
  private citiesCache: City[] | null = null;
  private citiesCacheTime = 0;
  /** Timestamp of the last failed cities-lookup attempt, if any */
  private citiesFetchFailedAt = 0;

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

  /**
   * Ensure the input carries a `reference` so the OrderNumber the shipment is
   * booked under is the exact value surfaced back on `Shipment.reference` (which
   * the caller needs for {@link trackByReference}). When no reference is
   * supplied we generate one here via the shared {@link generateOrderNumber} and
   * pass this prepared input to BOTH the request mapper and the response mapper,
   * so the request OrderNumber and the response reference always agree (otherwise
   * each would call `Date.now()` independently and disagree).
   */
  private withOrderNumber(input: CreateShipmentInput): CreateShipmentInput {
    if (input.reference) {
      return input;
    }
    return { ...input, reference: generateOrderNumber() };
  }

  /**
   * Load the SMSA Saudi cities list and cache it, mirroring the Aymakan
   * adapter's TTL + failure-cooldown behavior: a lookup outage falls back to
   * an empty cache (pass-through resolution) so it never blocks bookings.
   */
  private async ensureCitiesLoaded(): Promise<void> {
    const now = Date.now();
    if (this.citiesCache && now - this.citiesCacheTime < CITIES_CACHE_TTL) {
      return;
    }
    if (now - this.citiesFetchFailedAt < CITIES_FAILURE_COOLDOWN) {
      if (!this.citiesCache) this.citiesCache = [];
      return;
    }
    try {
      this.citiesCache = await this.getCities();
      this.citiesCacheTime = now;
    } catch {
      this.citiesFetchFailedAt = now;
      if (!this.citiesCache) this.citiesCache = [];
    }
  }

  /**
   * Normalize a Saudi address city against SMSA's own city list when a match
   * exists. Unmatched values pass through because the lookup is not exhaustive
   * and SMSA may still accept them during booking.
   */
  private resolveCity(
    address: CreateShipmentInput["shipper"] | CreateShipmentInput["consignee"],
  ): string {
    if (address.countryCode !== "SA") return address.city;
    if (!this.citiesCache || this.citiesCache.length === 0) return address.city;
    const match = findCityMatch(address.city, this.citiesCache);
    return match?.nameEn ?? address.city.trim();
  }

  /** Resolve shipper + consignee cities for a booking (lenient — see above). */
  private async resolveCitiesInInput(
    input: CreateShipmentInput,
  ): Promise<CreateShipmentInput> {
    await this.ensureCitiesLoaded();
    return {
      ...input,
      shipper: {
        ...input.shipper,
        city: this.resolveCity(input.shipper),
      },
      consignee: {
        ...input.consignee,
        city: this.resolveCity(input.consignee),
      },
    };
  }

  protected async executeCreateShipment(
    input: CreateShipmentInput,
  ): Promise<Shipment> {
    const prepared = await this.resolveCitiesInInput(
      this.withOrderNumber(input),
    );
    const isC2B =
      prepared.serviceType !== undefined &&
      C2B_SERVICE_CODES.has(prepared.serviceType.trim().toUpperCase());

    if (isC2B) {
      return this.createC2BShipment(prepared);
    }

    const request = mapCreateB2CRequest(prepared);
    const response = await this.http.post<SMSAShipmentResponse>(
      "/api/shipment/b2c/new",
      request,
    );

    return mapShipmentResponse(response, prepared);
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
   * **Important:** SMSA only supports cancellation for C2B/reverse-pickup
   * shipments, via the C2B endpoint. B2C shipments cannot be cancelled through
   * the SMSA API: the endpoint responds without a cancellation confirmation,
   * which is surfaced as an {@link APIError} (with `code: "CANCELLATION_UNCONFIRMED"`)
   * rather than a misleading `false`. That `code` lets callers distinguish this
   * "carrier did not confirm" case from a genuine request failure (network/4xx/5xx)
   * and fall back accordingly. Consistent with the other adapters, this method
   * either returns `true` or throws.
   *
   * Success is detected with a negation-aware check: a cancel token must be
   * present AND no negation token may be. A bare `includes("cancelled")` would
   * wrongly succeed on negatives like "Shipment cannot be cancelled",
   * "not cancelled" or "cancellation failed". Note "already cancelled" carries
   * no negation token, so it correctly reports success (idempotent cancel).
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    const response = await this.http.post<string>(
      `/api/c2b/cancel/${encodeURIComponent(trackingNumber)}`,
    );
    // A non-string (JSON) success response is treated as success.
    if (typeof response !== "string") {
      return true;
    }
    // Success messages contain a cancel token (e.g. "Shipment Cancelled
    // Successfully!"), but so do negative ones ("Shipment cannot be cancelled",
    // "cancellation failed"). Treat as success only when a cancel token is
    // present AND no negation token is — so "already cancelled" (idempotent
    // success) still passes while "not cancelled" does not. Anything else means
    // the carrier did NOT cancel — most commonly because this is a B2C shipment,
    // which the SMSA API cannot cancel.
    const hasCancelToken = /cancel/i.test(response);
    const hasNegation =
      /\b(?:not|can\s?not|can'?t|cant|unable|fail(?:ed|ure)?|invalid|reject(?:ed)?|error)\b/i.test(
        response,
      );
    if (hasCancelToken && !hasNegation) {
      return true;
    }
    // Distinguish "carrier responded but did not confirm cancellation" from a
    // genuine request failure (network/4xx/5xx, which throws separately via
    // HttpClient) so callers can tell "unconfirmed" apart from "failed" and
    // fall back accordingly (e.g. B2C shipments cannot be cancelled via the
    // SMSA API at all).
    throw new APIError(
      response.trim() || "SMSA did not confirm cancellation",
      {
        carrier: "smsaexpress",
        code: "CANCELLATION_UNCONFIRMED",
        raw: response,
      },
    );
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
        // Only swallow genuine 4xx (non-429) API errors (shipment type mismatch
        // / not found) so we can try the next path. Re-throw everything else:
        //  - non-APIError → auth (AuthenticationError) and network (NetworkError)
        //    are not APIErrors, so this clause re-throws them;
        //  - RateLimitError → a 429 that must propagate, not masquerade as
        //    "No label found" (it extends APIError, so guard it explicitly);
        //  - 5xx server errors.
        if (
          !(error instanceof APIError) ||
          error instanceof RateLimitError ||
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

    // Guard the shape before mapping: a non-array (e.g. an error object at
    // HTTP 200) would otherwise throw an opaque "response.map is not a function"
    // far from the cause.
    if (!Array.isArray(response)) {
      throw new MalformedResponseError("SMSA cities lookup returned an unexpected shape", {
        carrier: "smsaexpress",
        raw: response,
      });
    }

    return response.map(mapCity);
  }

  async getDropoffLocations(): Promise<Location[]> {
    const response = await this.http.get<SMSAOfficeLookupItem[]>(
      "/api/lookup/smsaoffices",
    );

    if (!Array.isArray(response)) {
      throw new MalformedResponseError("SMSA offices lookup returned an unexpected shape", {
        carrier: "smsaexpress",
        raw: response,
      });
    }

    return response.map(mapOffice);
  }

  /**
   * Account-enabled service products for this API key.
   *
   * SMSA's create docs mark `ServiceCode` optional and point at this lookup for
   * the codes your contract supports. Hardcoding sample values like EDDL is
   * unsafe — many accounts reject them with "Wrong service code".
   *
   * Prefer omitting ServiceCode on B2C create (account default) unless you have
   * confirmed a code from this list (or need EDCR for C2B reverse pickup).
   */
  async getServiceTypes(): Promise<SMSAServiceTypeLookupItem[]> {
    const response = await this.http.get<unknown>("/api/Lookup/ServiceTypes");

    if (!Array.isArray(response)) {
      throw new MalformedResponseError(
        "SMSA service-types lookup returned an unexpected shape",
        { carrier: "smsaexpress", raw: response },
      );
    }

    return response
      .map((item): SMSAServiceTypeLookupItem | null => {
        if (typeof item === "string" && item.trim()) {
          return { code: item.trim(), raw: item };
        }
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const codeRaw =
          row.Code ??
          row.code ??
          row.ServiceCode ??
          row.serviceCode ??
          row.ServiceType ??
          row.serviceType;
        if (typeof codeRaw !== "string" || !codeRaw.trim()) return null;
        const nameRaw =
          row.Name ??
          row.name ??
          row.ServiceName ??
          row.serviceName ??
          row.Description ??
          row.description;
        return {
          code: codeRaw.trim(),
          name: typeof nameRaw === "string" ? nameRaw : undefined,
          raw: item,
        };
      })
      .filter((x): x is SMSAServiceTypeLookupItem => x !== null);
  }

  // =========================================================================
  // 2-WAY SHIPMENT
  // =========================================================================

  async create2WayShipment(input: CreateShipmentInput): Promise<Shipment> {
    const prepared = await this.resolveCitiesInInput(
      this.withOrderNumber(input),
    );
    const request = mapCreate2WayRequest(prepared);
    const response = await this.http.post<SMSAShipmentResponse>(
      "/api/TwoWayShipment/new",
      request,
    );

    return mapShipmentResponse(response, prepared);
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
