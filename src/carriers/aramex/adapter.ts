// file: src/carriers/aramex/adapter.ts
/**
 * Aramex Carrier Adapter
 * Implementation of the CarrierAdapter interface for the Aramex JSON Shipping
 * Services API v2.
 *
 * Key differences from the other carriers:
 * - Auth is a `ClientInfo` object sent in EVERY request body (not headers).
 * - The four Aramex services (Shipping, Tracking, RateCalculator, Location)
 *   live on different base URLs, so the adapter holds one HttpClient per service.
 * - Errors use the "Fake 200 OK" pattern (HTTP 200 + `HasErrors`/`Notifications`),
 *   surfaced via the shared HttpClient's `errorExtractor` hook on every call.
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
  CarrierConfig,
  City,
  CreateShipmentInput,
  Location,
  Pickup,
  PickupRequest,
  Rate,
  Shipment,
  TrackingResult,
} from "../../core/types";
import { BaseCarrierAdapter } from "../base";
import {
  buildClientInfo,
  mapCalculateRateRequest,
  mapCity,
  mapCreateShipmentRequest,
  mapOffice,
  mapPickupRequest,
  mapPickupResponse,
  mapRate,
  mapShipmentResponse,
  mapTrackingResult,
  normalizeTrackingResults,
} from "./mappers";
import type {
  AramexCalculateRateResponse,
  AramexClientInfo,
  AramexCreatePickupResponse,
  AramexCancelPickupResponse,
  AramexCreateShipmentsResponse,
  AramexFetchCitiesResponse,
  AramexFetchOfficesResponse,
  AramexLabelInfo,
  AramexNotification,
  AramexPrintLabelResponse,
  AramexTrackShipmentsResponse,
} from "./types";

const SHIPPING_SANDBOX_URL =
  "https://ws.dev.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc";
const SHIPPING_PRODUCTION_URL =
  "https://ws.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc";

/** Default Aramex label report (HTML/PDF label at 9.7x21cm), returned as a URL. */
const DEFAULT_LABEL_INFO: AramexLabelInfo = {
  ReportID: 9201,
  ReportType: "URL",
};

/**
 * Aramex's WCF `Transaction` data contract marks Reference1–Reference5 as
 * REQUIRED members, so an empty `{}` fails deserialization ("required data
 * members 'Reference1..Reference5' were not found") on every operation. All five
 * must be present; empty strings are accepted.
 */
const EMPTY_TRANSACTION = {
  Reference1: "",
  Reference2: "",
  Reference3: "",
  Reference4: "",
  Reference5: "",
} as const;

export interface AramexConfig extends CarrierConfig {
  credentials: {
    userName: string;
    password: string;
    accountNumber: string;
    accountPin: string;
    accountEntity: string;
    accountCountryCode: string;
  };
  /** API source channel (default 24). */
  source?: number;
  /** ClientInfo version (default "v1.0"). */
  version?: string;
  /** Company name used when an address has no company set. */
  companyName?: string;
  /**
   * Optional override for the Location service base URL. Live Aramex WSDLs
   * disagree on the production Location host (ws.aramex.net vs anfe02.aramex.com);
   * set this if your account is provisioned on a different host.
   */
  locationBaseUrl?: string;
}

export class AramexAdapter extends BaseCarrierAdapter {
  readonly name = "aramex";
  readonly supportedCountries = [
    "SA",
    "AE",
    "BH",
    "KW",
    "OM",
    "QA",
    "JO",
    "EG",
    "LB",
    "IQ",
  ];

  private shippingHttp: HttpClient;
  private trackingHttp: HttpClient;
  private rateHttp: HttpClient;
  private locationHttp: HttpClient;

  constructor(config: AramexConfig) {
    super(config);
    const shippingBase = this.getBaseUrl();
    const common = {
      carrier: "aramex",
      // Aramex auth lives in the request body (ClientInfo), so no auth headers.
    };
    this.shippingHttp = new HttpClient({ ...common, baseUrl: shippingBase });
    this.trackingHttp = new HttpClient({
      ...common,
      baseUrl: this.serviceBase(shippingBase, "Tracking"),
    });
    this.rateHttp = new HttpClient({
      ...common,
      baseUrl: this.serviceBase(shippingBase, "RateCalculator"),
    });
    this.locationHttp = new HttpClient({
      ...common,
      baseUrl:
        config.locationBaseUrl ?? this.serviceBase(shippingBase, "Location"),
    });
  }

  protected getBaseUrl(): string {
    return this.config.mode === "production"
      ? SHIPPING_PRODUCTION_URL
      : SHIPPING_SANDBOX_URL;
  }

  /** Derive a sibling service base URL by swapping the `/Shipping/` segment. */
  private serviceBase(shippingBase: string, service: string): string {
    return shippingBase.replace("/Shipping/", `/${service}/`);
  }

  private get aramexConfig(): AramexConfig {
    return this.config as AramexConfig;
  }

  private buildClientInfo(): AramexClientInfo {
    const cfg = this.aramexConfig;
    return buildClientInfo(cfg.credentials, {
      source: cfg.source,
      version: cfg.version,
    });
  }

  /**
   * Extracts the Aramex "Fake 200 OK" error (envelope-level `HasErrors` +
   * `Notifications`). Passed to every request so the HttpClient raises APIError.
   */
  private static aramexErrorExtractor(json: unknown): {
    hasError: boolean;
    message?: string;
    errors?: Record<string, string[]>;
  } {
    const obj = json as {
      HasErrors?: boolean;
      Notifications?: AramexNotification[];
    } | null;
    const notifications = obj?.Notifications ?? [];
    const hasError = obj?.HasErrors === true;
    const message =
      notifications
        .map((n) => n?.Message)
        .filter(Boolean)
        .join("; ") || (hasError ? "Aramex returned an error" : undefined);
    return {
      hasError,
      message,
      errors: notifications.length
        ? AramexAdapter.notificationsToErrors(notifications)
        : undefined,
    };
  }

  private static notificationsToErrors(
    notifications: AramexNotification[],
  ): Record<string, string[]> {
    return {
      _aramex: notifications.map((n) =>
        `${n?.Code ?? ""}: ${n?.Message ?? ""}`.trim(),
      ),
    };
  }

  // =========================================================================
  // SHIPPING
  // =========================================================================

  protected async executeCreateShipment(
    input: CreateShipmentInput,
  ): Promise<Shipment> {
    const cfg = this.aramexConfig;
    const shipment = mapCreateShipmentRequest(input, {
      accountNumber: cfg.credentials.accountNumber,
      companyName: cfg.companyName,
    });

    const response = await this.shippingHttp.post<AramexCreateShipmentsResponse>(
      "/json/CreateShipments",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        LabelInfo: DEFAULT_LABEL_INFO,
        Shipments: [shipment],
      },
      { errorExtractor: AramexAdapter.aramexErrorExtractor },
    );

    const processed = response.Shipments?.[0];
    if (!processed) {
      throw new APIError("Aramex returned no shipment", {
        carrier: "aramex",
        raw: response,
      });
    }

    // CreateShipments can also fail per-shipment while the envelope is clean.
    if (processed.HasErrors) {
      const notifications = processed.Notifications ?? [];
      throw new APIError(
        notifications
          .map((n) => n.Message)
          .filter(Boolean)
          .join("; ") || "Failed to create shipment",
        {
          carrier: "aramex",
          errors: AramexAdapter.notificationsToErrors(notifications),
          raw: processed,
        },
      );
    }

    return mapShipmentResponse(processed, input);
  }

  /**
   * Create multiple shipments in a single request. Aramex's `CreateShipments`
   * operation is natively batch — it takes a `Shipments` array and returns one
   * processed result per shipment, in request order.
   *
   * Fails loud: if ANY shipment in the batch errors, an `APIError` is thrown
   * whose `raw` holds the full response, so already-created AWBs remain
   * recoverable (the unified `Shipment` type has no per-item error channel).
   */
  async createBulkShipments(
    inputs: CreateShipmentInput[],
  ): Promise<Shipment[]> {
    if (inputs.length === 0) {
      throw new ValidationError(
        "At least one shipment is required for bulk create",
        { raw: { count: 0 } },
      );
    }
    for (const input of inputs) validateCreateShipmentInput(input);

    const cfg = this.aramexConfig;
    const shipments = inputs.map((input) =>
      mapCreateShipmentRequest(input, {
        accountNumber: cfg.credentials.accountNumber,
        companyName: cfg.companyName,
      }),
    );

    const response = await this.shippingHttp.post<AramexCreateShipmentsResponse>(
      "/json/CreateShipments",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        LabelInfo: DEFAULT_LABEL_INFO,
        Shipments: shipments,
      },
      { errorExtractor: AramexAdapter.aramexErrorExtractor },
    );

    const processed = response.Shipments ?? [];
    if (processed.length === 0) {
      throw new APIError("Aramex returned no shipments", {
        carrier: "aramex",
        raw: response,
      });
    }

    const failed = processed.filter((p) => p.HasErrors);
    if (failed.length > 0) {
      const notifications = failed.flatMap((p) => p.Notifications ?? []);
      throw new APIError(
        notifications
          .map((n) => n.Message)
          .filter(Boolean)
          .join("; ") ||
          `Failed to create ${failed.length} of ${processed.length} shipments`,
        {
          carrier: "aramex",
          errors: AramexAdapter.notificationsToErrors(notifications),
          raw: response,
        },
      );
    }

    return processed.map((p, i) => mapShipmentResponse(p, inputs[i]));
  }

  /**
   * Aramex's classic Shipping Services API has no shipment-cancellation
   * endpoint, so this is unsupported. (Pickups can be cancelled via cancelPickup.)
   */
  cancelShipment(_trackingNumber: string): Promise<boolean> {
    throw new UnsupportedOperationError("aramex", "cancelShipment");
  }

  // =========================================================================
  // LABELS
  // =========================================================================

  async getLabel(
    trackingNumber: string,
    _format?: "PDF" | "ZPL" | "PNG",
  ): Promise<string> {
    // Aramex PrintLabel returns a URL to the label document. The requested
    // `format` cannot be honored (ZPL/PNG are not selectable) — always a URL.
    const response = await this.shippingHttp.post<AramexPrintLabelResponse>(
      "/json/PrintLabel",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        ShipmentNumber: trackingNumber,
        LabelInfo: DEFAULT_LABEL_INFO,
      },
      { errorExtractor: AramexAdapter.aramexErrorExtractor },
    );

    const url = response.ShipmentLabel?.LabelURL;
    if (!url) {
      throw new APIError("Failed to get label", {
        carrier: "aramex",
        raw: response,
      });
    }
    return url;
  }

  // =========================================================================
  // TRACKING
  // =========================================================================

  async track(trackingNumber: string): Promise<TrackingResult> {
    const results = await this.trackMultiple([trackingNumber]);
    const result = results[0];
    if (!result) {
      throw new APIError("Shipment not found", {
        carrier: "aramex",
        raw: { trackingNumber },
      });
    }
    return result;
  }

  async trackMultiple(trackingNumbers: string[]): Promise<TrackingResult[]> {
    const response = await this.trackingHttp.post<AramexTrackShipmentsResponse>(
      "/json/TrackShipments",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        Shipments: trackingNumbers,
        GetLastTrackingUpdateOnly: false,
      },
      { retry: true, errorExtractor: AramexAdapter.aramexErrorExtractor },
    );

    const map = normalizeTrackingResults(response.TrackingResults);
    return Object.entries(map).map(([waybill, results]) =>
      mapTrackingResult(waybill, results),
    );
  }

  async trackByReference(reference: string): Promise<TrackingResult> {
    // Aramex tracks references through the same TrackShipments operation.
    const result = await this.track(reference);
    return { ...result, reference };
  }

  // =========================================================================
  // RATES
  // =========================================================================

  async getRates(input: CreateShipmentInput): Promise<Rate[]> {
    const rateRequest = mapCalculateRateRequest(input);
    const response = await this.rateHttp.post<AramexCalculateRateResponse>(
      "/json/CalculateRate",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        ...rateRequest,
      },
      { retry: true, errorExtractor: AramexAdapter.aramexErrorExtractor },
    );

    // A clean envelope with no TotalAmount means Aramex couldn't price the
    // route. Surface it as an error rather than returning a misleading 0 rate.
    if (response.TotalAmount?.Value == null) {
      throw new APIError("Aramex returned no rate for this shipment", {
        carrier: "aramex",
        raw: response,
      });
    }

    return [mapRate(response, input)];
  }

  // =========================================================================
  // PICKUPS
  // =========================================================================

  async createPickup(input: PickupRequest): Promise<Pickup> {
    validatePickupRequest(input);
    const cfg = this.aramexConfig;
    const pickup = mapPickupRequest(input, {
      accountNumber: cfg.credentials.accountNumber,
      countryCode: cfg.credentials.accountCountryCode,
      companyName: cfg.companyName,
    });

    const response = await this.shippingHttp.post<AramexCreatePickupResponse>(
      "/json/CreatePickup",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        Pickup: pickup,
      },
      { errorExtractor: AramexAdapter.aramexErrorExtractor },
    );

    // Judge success on the body payload, not the HTTP status: a "Fake 200 OK"
    // can carry an empty ProcessedPickup. A usable pickup needs a GUID (or ID).
    const processed = response.ProcessedPickup;
    if (!processed || (!processed.GUID && !processed.ID)) {
      throw new APIError("Failed to create pickup", {
        carrier: "aramex",
        raw: response,
      });
    }

    return mapPickupResponse(processed, input);
  }

  async cancelPickup(pickupId: string | number): Promise<boolean> {
    const response = await this.shippingHttp.post<AramexCancelPickupResponse>(
      "/json/CancelPickup",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        PickupGUID: String(pickupId),
      },
      { errorExtractor: AramexAdapter.aramexErrorExtractor },
    );
    // The errorExtractor already throws on `HasErrors: true`, so reaching here
    // means the body reported no error — judge success from that, treating a
    // missing flag as success (consistent with the extractor's `=== true`).
    return response.HasErrors !== true;
  }

  // =========================================================================
  // CITIES & LOCATIONS
  // =========================================================================

  async getCities(countryCode?: string): Promise<City[]> {
    const response = await this.locationHttp.post<AramexFetchCitiesResponse>(
      "/json/FetchCities",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        CountryCode:
          countryCode ?? this.aramexConfig.credentials.accountCountryCode,
      },
      { retry: true, errorExtractor: AramexAdapter.aramexErrorExtractor },
    );

    return (response.Cities ?? []).map(mapCity);
  }

  async getDropoffLocations(countryCode?: string): Promise<Location[]> {
    const response = await this.locationHttp.post<AramexFetchOfficesResponse>(
      "/json/FetchOffices",
      {
        ClientInfo: this.buildClientInfo(),
        Transaction: EMPTY_TRANSACTION,
        CountryCode:
          countryCode ?? this.aramexConfig.credentials.accountCountryCode,
      },
      { retry: true, errorExtractor: AramexAdapter.aramexErrorExtractor },
    );

    return (response.Offices ?? []).map(mapOffice);
  }
}
