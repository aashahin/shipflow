// file: src/carriers/aymakan/adapter.ts
/**
 * Aymakan Carrier Adapter
 * Full implementation of the CarrierAdapter interface for Aymakan API.
 */

import {
  CITIES_CACHE_TTL,
  CITIES_FAILURE_COOLDOWN,
  findCityMatch,
} from "../../core/city-resolver";
import {
  APIError,
  MalformedResponseError,
  ValidationError,
} from "../../core/errors";
import { HttpClient } from "../../core/http";
import {
  validateCreateShipmentInput,
  validatePickupRequest,
} from "../../core/schemas";
import type {
  Address,
  CarrierConfig,
  City,
  CreateShipmentInput,
  CustomerAddress,
  Pickup,
  PickupRequest,
  Shipment,
  TimeSlot,
  TrackingResult,
  WebhookConfig,
  WebhookEvent,
} from "../../core/types";
import { BaseCarrierAdapter } from "../base";
import {
  mapCity,
  mapCreateShipmentRequest,
  mapCustomerAddressRequest,
  mapPickupRequest,
  mapPickupResponse,
  mapShipmentResponse,
  mapTrackingResult,
  parseAymakanWebhook,
  sanitizePhone,
} from "./mappers";
import type {
  AymakanAddressResponse,
  AymakanCancelResponse,
  AymakanCitiesResponse,
  AymakanCreateShipmentResponse,
  AymakanPickupResponse,
  AymakanShipmentResponse,
  AymakanTrackResponse,
} from "./types";

const AYMAKAN_SANDBOX_URL = "https://dev-api.aymakan.com.sa/v2";
const AYMAKAN_PRODUCTION_URL = "https://api.aymakan.net/v2";

/**
 * Aymakan returns logical errors inside a fake-200 envelope (HTTP 200 with an
 * error flag/message in the body). Without an extractor these are swallowed —
 * e.g. cancel endpoints would return `success: undefined` and the adapter would
 * report `false` with no reason. This extractor surfaces those as APIError.
 *
 * Recognised error shapes (all on a 200 body):
 * - `{ error: true, ... }`            → Laravel/Aymakan error flag
 * - `{ success: false, ... }`         → explicit failure flag
 * - `{ message }` / `{ response }`    → human-readable error text
 * - `{ errors: { field: [...] } }`    → Laravel field validation errors
 *
 * A bare `{ message }` is NOT treated as an error on its own (many success
 * envelopes carry a `message`); we only flag when `error`/`success:false` is
 * present, or validation `errors` exist.
 */
/**
 * Pull a human-readable message out of an object-shaped error value, e.g.
 * `{ error: { message: "..." } }` or `{ error: { response: "..." } }`.
 */
function extractNestedMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.response === "string") return obj.response;
  }
  return undefined;
}

/** Join Laravel-style `{ field: [msg, ...] }` validation errors into one string. */
function joinFieldErrors(errors: Record<string, unknown>): string | undefined {
  const parts = Object.values(errors)
    .flat()
    .filter((v): v is string => typeof v === "string");
  return parts.length ? parts.join("; ") : undefined;
}

function aymakanErrorExtractor(json: unknown): {
  hasError: boolean;
  message?: string;
  errors?: Record<string, string[]>;
} {
  if (!json || typeof json !== "object") {
    return { hasError: false };
  }
  const obj = json as Record<string, unknown>;

  const hasValidationErrors =
    !!obj.errors &&
    typeof obj.errors === "object" &&
    Object.keys(obj.errors as object).length > 0;
  const hasError = obj.error === true || obj.success === false || hasValidationErrors;

  if (!hasError) {
    return { hasError: false };
  }

  const message =
    (typeof obj.message === "string" && obj.message) ||
    (typeof obj.response === "string" && obj.response) ||
    (typeof obj.error === "string" && obj.error) ||
    extractNestedMessage(obj.error) ||
    (hasValidationErrors
      ? joinFieldErrors(obj.errors as Record<string, string[]>)
      : undefined) ||
    undefined;

  return {
    hasError: true,
    message,
    errors: hasValidationErrors
      ? (obj.errors as Record<string, string[]>)
      : undefined,
  };
}

export interface AymakanConfig extends CarrierConfig {
  credentials: {
    apiKey: string;
  };
}

export class AymakanAdapter extends BaseCarrierAdapter {
  readonly name = "aymakan";
  readonly supportedCountries = ["SA", "AE", "BH", "KW", "OM", "QA"];

  private http: HttpClient;

  /**
   * Shared options applied to every Aymakan http call so fake-200 error
   * envelopes surface as APIError instead of being silently swallowed.
   */
  private readonly errorOpts = { errorExtractor: aymakanErrorExtractor };

  /** Cached Aymakan cities list for city name resolution */
  private citiesCache: City[] | null = null;
  private citiesCacheTime = 0;
  /** Timestamp of the last failed /cities fetch attempt, if any */
  private citiesFetchFailedAt = 0;

  constructor(config: AymakanConfig) {
    super(config);
    this.http = new HttpClient({
      baseUrl: this.getBaseUrl(),
      carrier: "aymakan",
      headers: {
        Authorization: config.credentials.apiKey,
      },
    });
  }

  protected getBaseUrl(): string {
    return this.config.mode === "production"
      ? AYMAKAN_PRODUCTION_URL
      : AYMAKAN_SANDBOX_URL;
  }

  // =========================================================================
  // CITY RESOLUTION
  // =========================================================================

  /**
   * Load cities list from Aymakan API and cache it.
   * Silently falls back to empty list on failure so shipments can still be attempted.
   */
  private async ensureCitiesLoaded(): Promise<void> {
    const now = Date.now();
    if (
      this.citiesCache &&
      now - this.citiesCacheTime < CITIES_CACHE_TTL
    ) {
      return;
    }
    // A recent failure is still in its cooldown window — skip re-attempting
    // the /cities fetch and fall back to whatever cache we have (possibly
    // empty), so an outage never hard-blocks shipment/pickup creation.
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
   * Resolve a user-input city name to the valid Aymakan English city name via
   * the shared matcher (see core/city-resolver.ts for the strategy). Lenient:
   * falls back to the original input when nothing matches or the cities list
   * is unavailable — used for pickups, where an invalid city only affects the
   * merchant's own pickup request.
   */
  private resolveCity(inputCity: string): string {
    if (!this.citiesCache || this.citiesCache.length === 0) return inputCity;
    const trimmed = inputCity.trim();
    if (!trimmed) return inputCity;
    return findCityMatch(trimmed, this.citiesCache)?.nameEn ?? trimmed;
  }

  /**
   * Strict variant used for shipment creation: when Aymakan's own city list is
   * loaded and the input matches nothing in it, the booking would be rejected
   * by the API anyway — fail fast with a clear, field-scoped error instead of
   * an opaque carrier 400. When the list is unavailable (fetch failed /
   * cooldown), fall back to pass-through so a /cities outage never blocks
   * shipment creation.
   *
   * Strict validation is Saudi-only: Aymakan's city list is the Saudi
   * gazetteer, but Aymakan also serves other GCC countries (see
   * supportedCountries), so a non-SA address passes through untouched —
   * mirroring the SMSA adapter.
   */
  private resolveCityStrict(
    address: CreateShipmentInput["shipper"] | CreateShipmentInput["consignee"],
    field: "shipper.city" | "consignee.city",
  ): string {
    if (address.countryCode !== "SA") return address.city;
    if (!this.citiesCache || this.citiesCache.length === 0) return address.city;
    const match = findCityMatch(address.city, this.citiesCache);
    if (!match) {
      throw new ValidationError(
        `Unknown ${field.replace(".city", "")} city "${address.city}": not in Aymakan's supported city list`,
        { field },
      );
    }
    return match.nameEn;
  }

  /**
   * Resolve city names in a CreateShipmentInput to valid Aymakan city names,
   * rejecting SA cities Aymakan does not serve (strict — see resolveCityStrict).
   */
  private resolveCitiesInInput(
    input: CreateShipmentInput,
  ): CreateShipmentInput {
    return {
      ...input,
      shipper: {
        ...input.shipper,
        city: this.resolveCityStrict(input.shipper, "shipper.city"),
      },
      consignee: {
        ...input.consignee,
        city: this.resolveCityStrict(input.consignee, "consignee.city"),
      },
    };
  }

  // =========================================================================
  // SHIPPING
  // =========================================================================

  protected async executeCreateShipment(
    input: CreateShipmentInput,
  ): Promise<Shipment> {
    await this.ensureCitiesLoaded();
    const resolved = this.resolveCitiesInInput(input);
    const request = mapCreateShipmentRequest(resolved);
    const response = await this.http.post<AymakanCreateShipmentResponse>(
      "/shipping/create",
      request,
      this.errorOpts,
    );

    if (!response.success) {
      throw new APIError("Failed to create shipment", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return mapShipmentResponse(response.shipping);
  }

  async createBulkShipments(
    inputs: CreateShipmentInput[],
  ): Promise<Shipment[]> {
    // Nothing to create — avoid an empty request to the carrier.
    if (inputs.length === 0) return [];
    // Aymakan rejects batches larger than 30 ("Only 30 shipments can be
    // created at a time."), so fail fast with a clear error before the request.
    if (inputs.length > 30) {
      throw new ValidationError(
        "Aymakan bulk create accepts at most 30 shipments per request",
        { raw: { count: inputs.length } },
      );
    }
    inputs.forEach(validateCreateShipmentInput);
    await this.ensureCitiesLoaded();
    const requests = inputs
      .map((i) => this.resolveCitiesInInput(i))
      .map(mapCreateShipmentRequest);
    const response = await this.http.post<{
      success: boolean;
      message?: string;
      bulk_awb?: string;
      total_shipments?: number;
      shipments: AymakanCreateShipmentResponse["shipping"][];
    }>("/shipping/create/bulk_shipping", { shipments: requests }, this.errorOpts);

    if (!response.success) {
      throw new APIError("Failed to create bulk shipments", {
        carrier: "aymakan",
        raw: response,
      });
    }

    if (!Array.isArray(response.shipments)) {
      throw new MalformedResponseError(
        "Aymakan bulk create response is missing the shipments array",
        { carrier: "aymakan", raw: response },
      );
    }

    return response.shipments.map(mapShipmentResponse);
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    // The errorExtractor surfaces fake-200 error envelopes as APIError, so a
    // real failure throws with the carrier's message rather than silently
    // returning false.
    const response = await this.http.post<AymakanCancelResponse>(
      "/shipping/cancel",
      {
        tracking: trackingNumber,
      },
      this.errorOpts,
    );
    return response.success === true;
  }

  async cancelByReference(reference: string): Promise<boolean> {
    const response = await this.http.post<AymakanCancelResponse>(
      "/shipping/cancel_by_reference",
      { reference },
      this.errorOpts,
    );
    return response.success === true;
  }

  async updateDeliveryAddress(
    trackingNumber: string,
    address: Address,
  ): Promise<boolean> {
    await this.ensureCitiesLoaded();
    const resolvedCity = this.resolveCity(address.city);
    // Documented endpoint: POST /shipping/update/delivery_address with the
    // tracking number as a `tracking` field in the JSON body (NOT in the path).
    const response = await this.http.post<{ success: boolean }>(
      "/shipping/update/delivery_address",
      {
        tracking: trackingNumber,
        delivery_name: address.name,
        delivery_email: address.email,
        delivery_city: resolvedCity,
        delivery_address: address.line1,
        delivery_neighbourhood: address.neighbourhood,
        delivery_postcode: address.postalCode,
        delivery_country: address.countryCode,
        delivery_phone: sanitizePhone(address.phone),
      },
      this.errorOpts,
    );
    return response.success === true;
  }

  // =========================================================================
  // TRACKING
  // =========================================================================

  async track(trackingNumber: string): Promise<TrackingResult> {
    const results = await this.trackMultiple([trackingNumber]);
    const result = results[0];
    if (!result) {
      throw new APIError("Shipment not found", { carrier: "aymakan" });
    }
    return result;
  }

  async trackMultiple(trackingNumbers: string[]): Promise<TrackingResult[]> {
    const ids = trackingNumbers.map(encodeURIComponent).join(",");
    const response = await this.http.get<AymakanTrackResponse>(
      `/shipping/track/${ids}`,
      this.errorOpts,
    );

    if (!response.success) {
      throw new APIError("Failed to track shipments", {
        carrier: "aymakan",
        raw: response,
      });
    }

    if (!Array.isArray(response.data?.shipments)) {
      throw new MalformedResponseError("Aymakan track response is missing data.shipments", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return response.data.shipments.map(mapTrackingResult);
  }

  async trackByReference(reference: string): Promise<TrackingResult> {
    const response = await this.http.get<AymakanTrackResponse>(
      `/shipping/by_reference/${encodeURIComponent(reference)}`,
      this.errorOpts,
    );

    const shipment = response.data?.shipments?.[0];
    if (!response.success || !shipment) {
      throw new APIError("Shipment not found", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return mapTrackingResult(shipment);
  }

  // =========================================================================
  // LABELS
  // =========================================================================

  async getLabel(
    trackingNumber: string,
    _format?: "PDF" | "ZPL" | "PNG",
  ): Promise<string> {
    // Note: this endpoint always returns a single PDF download URL, so the
    // requested `format` cannot be honored.
    const response = await this.http.get<{
      success: boolean;
      error?: boolean;
      message?: string;
      response?: string;
      data: { awb_url: string };
    }>(
      `/shipping/awb/tracking/${encodeURIComponent(trackingNumber)}`,
      this.errorOpts,
    );

    if (!response.success || !response.data?.awb_url) {
      const msg = response.message ?? response.response ?? "Failed to get label";
      throw new APIError(msg, { carrier: "aymakan", raw: response });
    }

    return response.data.awb_url;
  }

  async getBulkLabels(trackingNumbers: string[]): Promise<string> {
    // Documented as a GET with comma-separated tracking numbers in the path.
    const ids = trackingNumbers.map(encodeURIComponent).join(",");
    const response = await this.http.get<{
      success: boolean;
      error?: boolean;
      message?: string;
      response?: string;
      data: { bulk_awb_url: string };
    }>(`/shipping/bulk_awb/trackings/${ids}`, this.errorOpts);

    if (!response.success || !response.data?.bulk_awb_url) {
      const msg =
        response.message ?? response.response ?? "Failed to get bulk labels";
      throw new APIError(msg, { carrier: "aymakan", raw: response });
    }

    return response.data.bulk_awb_url;
  }

  // =========================================================================
  // PICKUPS
  // =========================================================================

  async getPickupCities(): Promise<City[]> {
    const response = await this.http.get<AymakanCitiesResponse>(
      "/pickup_request/cities",
      this.errorOpts,
    );

    if (!response.success) {
      throw new APIError("Failed to get pickup cities", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return response.data.cities.map(mapCity);
  }

  async getTimeSlots(_city: string, date: string): Promise<TimeSlot[]> {
    const response = await this.http.get<{
      success: boolean;
      error?: boolean;
      message?: string;
      data: {
        date: string;
        slots: Record<string, string>;
      };
    }>(`/time_slots/${encodeURIComponent(date)}`, this.errorOpts);

    // Aymakan returns error responses for invalid dates (past, Fridays, etc.)
    if (!response.success || response.error || !response.data?.slots) {
      const msg = response.message ?? "No slots available";
      throw new APIError(msg, { carrier: "aymakan", raw: response });
    }

    // data.slots is an object like { "afternoon": "After Noon (02 PM - 06 PM)" }
    return Object.entries(response.data.slots).map(([id, label]) => ({
      id,
      label,
    }));
  }

  async createPickup(input: PickupRequest): Promise<Pickup> {
    validatePickupRequest(input);
    await this.ensureCitiesLoaded();
    const resolvedInput = { ...input, city: this.resolveCity(input.city) };
    const request = mapPickupRequest(resolvedInput);
    const response = await this.http.post<AymakanPickupResponse>(
      "/pickup_request/create",
      request,
      this.errorOpts,
    );

    if (!response.success) {
      throw new APIError("Failed to create pickup", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return mapPickupResponse(response.data);
  }

  async cancelPickup(pickupId: string | number): Promise<boolean> {
    const response = await this.http.post<{ success: boolean }>(
      "/pickup_request/cancel",
      { pickup_request: Number(pickupId) },
      this.errorOpts,
    );
    return response.success === true;
  }

  async getPickupRequests(): Promise<Pickup[]> {
    // The list endpoint returns a Laravel paginated structure:
    // { success, data: { pickupRequests: { data: [...] } } }
    const response = await this.http.get<{
      success: boolean;
      data: { pickupRequests: { data: AymakanPickupResponse["data"][] } };
    }>("/pickup_request/list", this.errorOpts);

    if (!response.success) {
      throw new APIError("Failed to get pickup requests", {
        carrier: "aymakan",
        raw: response,
      });
    }

    const list = response.data?.pickupRequests?.data;
    if (!Array.isArray(list)) {
      throw new MalformedResponseError(
        "Aymakan pickup list response is missing data.pickupRequests.data",
        { carrier: "aymakan", raw: response },
      );
    }

    return list.map(mapPickupResponse);
  }

  // =========================================================================
  // CITIES & LOCATIONS
  // =========================================================================

  async getCities(): Promise<City[]> {
    const response = await this.http.get<AymakanCitiesResponse>(
      "/cities",
      this.errorOpts,
    );

    if (!response.success) {
      throw new APIError("Failed to get cities", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return response.data.cities.map(mapCity);
  }

  async getDropoffLocations(): Promise<
    {
      id: string;
      name: string;
      address?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    }[]
  > {
    // The API returns `data` as a flat array of warehouse objects. There is no
    // `id` field — the warehouse code lives in `name` (e.g. "RUH-WH").
    const response = await this.http.get<{
      success: boolean;
      data: Array<{
        name: string;
        city?: string;
        address?: string;
        manager?: string;
        mobile_phone?: string;
        email?: string;
        location_lat?: number | null;
        location_lng?: number | null;
      }>;
    }>("/dropoff_locations", this.errorOpts);

    if (!response.success) {
      throw new APIError("Failed to get dropoff locations", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return response.data.map((loc) => ({
      id: loc.name,
      name: loc.name,
      address: loc.address,
      city: loc.city,
      latitude: loc.location_lat ?? undefined,
      longitude: loc.location_lng ?? undefined,
    }));
  }

  // =========================================================================
  // CUSTOMER ADDRESSES
  // =========================================================================

  async createCustomerAddress(
    address: CustomerAddress,
  ): Promise<CustomerAddress> {
    const request = mapCustomerAddressRequest(address);
    const response = await this.http.post<AymakanAddressResponse>(
      "/address/create",
      request,
      this.errorOpts,
    );

    if (!response.success || !response.data?.address) {
      throw new APIError("Failed to create address", {
        carrier: "aymakan",
        raw: response,
      });
    }

    const addr = response.data.address;
    return {
      id: addr.id,
      title: addr.title,
      name: addr.name,
      email: addr.email,
      phone: addr.phone,
      city: addr.city,
      address: addr.address,
      neighbourhood: addr.neighbourhood,
      postalCode: addr.postcode,
      countryCode: addr.country,
      description: addr.description,
    };
  }

  async getCustomerAddresses(): Promise<CustomerAddress[]> {
    const response = await this.http.get<{
      success: boolean;
      data: { address: AymakanAddressResponse["data"]["address"][] };
    }>("/address/list", this.errorOpts);

    if (!response.success) {
      throw new APIError("Failed to get customer addresses", {
        carrier: "aymakan",
        raw: response,
      });
    }

    if (!Array.isArray(response.data?.address)) {
      throw new MalformedResponseError(
        "Aymakan address list response is missing data.address",
        { carrier: "aymakan", raw: response },
      );
    }

    return response.data.address.map((addr) => ({
      id: addr.id,
      title: addr.title,
      name: addr.name,
      email: addr.email,
      phone: addr.phone,
      city: addr.city,
      address: addr.address,
      neighbourhood: addr.neighbourhood,
      postalCode: addr.postcode,
      countryCode: addr.country,
      description: addr.description,
    }));
  }

  async updateCustomerAddress(
    id: number,
    address: Partial<CustomerAddress>,
  ): Promise<CustomerAddress> {
    const response = await this.http.put<AymakanAddressResponse>(
      "/address/update",
      {
        id,
        title: address.title,
        name: address.name,
        email: address.email,
        city: address.city,
        address: address.address,
        neighbourhood: address.neighbourhood,
        postcode: address.postalCode,
        phone: address.phone,
        description: address.description,
      },
      this.errorOpts,
    );

    if (!response.success || !response.data?.address) {
      throw new APIError("Failed to update address", {
        carrier: "aymakan",
        raw: response,
      });
    }

    const addr = response.data.address;
    return {
      id: addr.id,
      title: addr.title,
      name: addr.name,
      email: addr.email,
      phone: addr.phone,
      city: addr.city,
      address: addr.address,
      neighbourhood: addr.neighbourhood,
      postalCode: addr.postcode,
      countryCode: addr.country,
      description: addr.description,
    };
  }

  async deleteCustomerAddress(id: number): Promise<boolean> {
    // The id must be sent in the JSON request body, not the URL path.
    const response = await this.http.delete<{ success: boolean }>(
      "/address/delete",
      { body: { id }, errorExtractor: aymakanErrorExtractor },
    );
    return response.success === true;
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
    return parseAymakanWebhook(payload, options);
  }
}
