// file: src/carriers/aymakan/adapter.ts
/**
 * Aymakan Carrier Adapter
 * Full implementation of the CarrierAdapter interface for Aymakan API.
 */

import {
  APIError,
  UnsupportedOperationError,
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
} from "./mappers";
import type {
  AymakanAddressResponse,
  AymakanCancelResponse,
  AymakanCitiesResponse,
  AymakanCreateShipmentResponse,
  AymakanPickupResponse,
  AymakanTrackResponse,
} from "./types";

const AYMAKAN_SANDBOX_URL = "https://dev-api.aymakan.com.sa/v2";
const AYMAKAN_PRODUCTION_URL = "https://api.aymakan.net/v2";

export interface AymakanConfig extends CarrierConfig {
  credentials: {
    apiKey: string;
  };
}

export class AymakanAdapter extends BaseCarrierAdapter {
  readonly name = "aymakan";
  readonly supportedCountries = ["SA", "AE", "BH", "KW", "OM", "QA"];

  private http: HttpClient;

  /** Cached Aymakan cities list for city name resolution */
  private citiesCache: City[] | null = null;
  private citiesCacheTime = 0;
  /** Cache TTL: 1 hour */
  private static readonly CITIES_CACHE_TTL = 60 * 60 * 1000;

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
    if (
      this.citiesCache &&
      Date.now() - this.citiesCacheTime < AymakanAdapter.CITIES_CACHE_TTL
    ) {
      return;
    }
    try {
      this.citiesCache = await this.getCities();
      this.citiesCacheTime = Date.now();
    } catch {
      if (!this.citiesCache) this.citiesCache = [];
    }
  }

  /**
   * Normalize Arabic text for comparison:
   * - Strip diacritics (tashkeel)
   * - Normalize alef variants (أ إ آ → ا)
   * - Normalize taa marbuta (ة → ه)
   * - Trim whitespace
   */
  private static normalizeArabic(text: string): string {
    return text
      .trim()
      .replace(/[\u064B-\u065F\u0670]/g, "") // strip tashkeel
      .replace(/[أإآ]/g, "ا") // normalize alef
      .replace(/ة/g, "ه"); // normalize taa marbuta
  }

  /**
   * Resolve a user-input city name to the valid Aymakan English city name.
   *
   * Matching strategy (first match wins):
   * 1. Exact match on English name (case-insensitive)
   * 2. Exact match on Arabic name
   * 3. Normalized Arabic match (handles tashkeel, alef variants, taa marbuta)
   * 4. Match after stripping "ال" prefix from Arabic input
   * 5. Substring/contains match on English name (case-insensitive)
   *
   * Falls back to the original input if no match is found.
   */
  private resolveCity(inputCity: string): string {
    if (!this.citiesCache || this.citiesCache.length === 0) return inputCity;

    const trimmed = inputCity.trim();
    if (!trimmed) return inputCity;
    const lower = trimmed.toLowerCase();

    // 1. Exact English match (case-insensitive)
    const exactEn = this.citiesCache.find(
      (c) => c.nameEn.toLowerCase() === lower,
    );
    if (exactEn) return exactEn.nameEn;

    // 2. Exact Arabic match
    const exactAr = this.citiesCache.find((c) => c.nameAr === trimmed);
    if (exactAr) return exactAr.nameEn;

    // 3. Normalized Arabic match
    const normalizedInput = AymakanAdapter.normalizeArabic(trimmed);
    const normalizedAr = this.citiesCache.find(
      (c) =>
        c.nameAr &&
        AymakanAdapter.normalizeArabic(c.nameAr) === normalizedInput,
    );
    if (normalizedAr) return normalizedAr.nameEn;

    // 4. Arabic without "ال" prefix
    const withoutAl = normalizedInput.startsWith("ال")
      ? normalizedInput.slice(2)
      : `ال${normalizedInput}`;
    const alMatch = this.citiesCache.find(
      (c) => c.nameAr && AymakanAdapter.normalizeArabic(c.nameAr) === withoutAl,
    );
    if (alMatch) return alMatch.nameEn;

    // 5. Contains match on English name (for partial matches like "Riyadh" in "Riyadh City")
    const containsEn = this.citiesCache.find(
      (c) =>
        c.nameEn.toLowerCase().includes(lower) ||
        lower.includes(c.nameEn.toLowerCase()),
    );
    if (containsEn) return containsEn.nameEn;

    // No match — return as-is and let the API return a validation error
    return trimmed;
  }

  /**
   * Resolve city names in a CreateShipmentInput to valid Aymakan city names.
   */
  private resolveCitiesInInput(
    input: CreateShipmentInput,
  ): CreateShipmentInput {
    return {
      ...input,
      shipper: {
        ...input.shipper,
        city: this.resolveCity(input.shipper.city),
      },
      consignee: {
        ...input.consignee,
        city: this.resolveCity(input.consignee.city),
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
    }>("/shipping/create/bulk_shipping", { shipments: requests });

    if (!response.success) {
      throw new APIError("Failed to create bulk shipments", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return response.shipments.map(mapShipmentResponse);
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    // Try passing as body
    const response = await this.http.post<AymakanCancelResponse>(
      "/shipping/cancel",
      {
        tracking: trackingNumber,
      },
    );
    return response.success === true;
  }

  async cancelByReference(reference: string): Promise<boolean> {
    const response = await this.http.post<AymakanCancelResponse>(
      "/shipping/cancel_by_reference",
      { reference },
    );
    return response.success === true;
  }

  async updateDeliveryAddress(
    trackingNumber: string,
    address: Address,
  ): Promise<boolean> {
    await this.ensureCitiesLoaded();
    const resolvedCity = this.resolveCity(address.city);
    const response = await this.http.post<{ success: boolean }>(
      `/shipping/update_delivery_address/${encodeURIComponent(trackingNumber)}`,
      {
        delivery_name: address.name,
        delivery_email: address.email,
        delivery_city: resolvedCity,
        delivery_address: address.line1,
        delivery_neighbourhood: address.neighbourhood,
        delivery_postcode: address.postalCode,
        delivery_country: address.countryCode,
        delivery_phone: address.phone,
      },
    );
    return response.success;
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
    );

    if (!response.success) {
      throw new APIError("Failed to track shipments", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return response.data.shipments.map(mapTrackingResult);
  }

  async trackByReference(reference: string): Promise<TrackingResult> {
    const response = await this.http.get<AymakanTrackResponse>(
      `/shipping/by_reference/${encodeURIComponent(reference)}`,
    );

    if (!response.success || !response.data.shipments[0]) {
      throw new APIError("Shipment not found", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return mapTrackingResult(response.data.shipments[0]);
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
    }>(`/shipping/awb/tracking/${encodeURIComponent(trackingNumber)}`);

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
    }>(`/shipping/bulk_awb/trackings/${ids}`);

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
    }>(`/time_slots/${date}`);

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
    );
    return response.success === true;
  }

  async getPickupRequests(): Promise<Pickup[]> {
    // The list endpoint returns a Laravel paginated structure:
    // { success, data: { pickupRequests: { data: [...] } } }
    const response = await this.http.get<{
      success: boolean;
      data: { pickupRequests: { data: AymakanPickupResponse["data"][] } };
    }>("/pickup_request/list");

    if (!response.success) {
      throw new APIError("Failed to get pickup requests", {
        carrier: "aymakan",
        raw: response,
      });
    }

    return response.data.pickupRequests.data.map(mapPickupResponse);
  }

  // =========================================================================
  // CITIES & LOCATIONS
  // =========================================================================

  async getCities(): Promise<City[]> {
    const response = await this.http.get<AymakanCitiesResponse>("/cities");

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
    }>("/dropoff_locations");

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
    );

    if (!response.success) {
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
    }>("/address/list");

    if (!response.success) {
      throw new APIError("Failed to get customer addresses", {
        carrier: "aymakan",
        raw: response,
      });
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
    );

    if (!response.success) {
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
      { body: { id } },
    );
    return response.success;
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

  // =========================================================================
  // NOT SUPPORTED
  // =========================================================================

  getRates(): Promise<never> {
    throw new UnsupportedOperationError("aymakan", "getRates");
  }
}
