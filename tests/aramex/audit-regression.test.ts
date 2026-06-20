// file: tests/aramex/audit-regression.test.ts
/**
 * Aramex Audit Regression Tests
 * Locks in the load-bearing contract decisions: per-service base-URL routing,
 * mode → host selection, ClientInfo-in-body auth, pickup create/cancel, and the
 * unsupported cancelShipment. Uses mocked fetch — no network calls.
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { AramexAdapter } from "../../src/carriers/aramex";
import { APIError, UnsupportedOperationError } from "../../src/core/errors";
import type { CreateShipmentInput, PickupRequest } from "../../src/core/types";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const sampleInput = (): CreateShipmentInput => ({
  shipper: {
    name: "Store",
    phone: "966500000000",
    line1: "A St",
    city: "Riyadh",
    countryCode: "SA",
  },
  consignee: {
    name: "Customer",
    phone: "966500000001",
    line1: "B St",
    city: "Jeddah",
    countryCode: "SA",
  },
  parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
});

const samplePickup = (): PickupRequest => ({
  date: "2026-07-01",
  timeSlot: "09:00-17:00",
  city: "Riyadh",
  contactName: "Store Manager",
  contactPhone: "966500000000",
  address: "King Fahd Road",
  shipmentCount: 2,
});

const createOk = () =>
  json({
    HasErrors: false,
    Notifications: [],
    Shipments: [{ ID: "AWB1", HasErrors: false, Notifications: [] }],
  });

function lastCall(): [string, RequestInit] {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1] as unknown as [string, RequestInit];
}

const credentials = {
  userName: "test@user.com",
  password: "secret",
  accountNumber: "12345",
  accountPin: "9999",
  accountEntity: "RUH",
  accountCountryCode: "SA",
};

describe("Aramex audit regression", () => {
  let adapter: AramexAdapter;

  beforeAll(() => {
    globalThis.fetch = mockFetch as any;
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });
  beforeEach(() => {
    mockFetch.mockReset();
    adapter = new AramexAdapter({ mode: "sandbox", credentials });
  });

  describe("per-service base-URL routing", () => {
    test("CreateShipments hits the Shipping service on the sandbox host", async () => {
      mockFetch.mockResolvedValueOnce(createOk());
      await adapter.createShipment(sampleInput());
      const [url] = lastCall();
      expect(url).toContain("ws.dev.aramex.net");
      expect(url).toContain("/Shipping/Service_1_0.svc/json/CreateShipments");
    });

    test("TrackShipments hits the Tracking service", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          TrackingResults: [],
          NonExistingWaybills: [],
        }),
      );
      await adapter.trackMultiple(["AWB1"]);
      const [url] = lastCall();
      expect(url).toContain("/Tracking/Service_1_0.svc/json/TrackShipments");
    });

    test("CalculateRate hits the RateCalculator service", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          TotalAmount: { Value: 10, CurrencyCode: "SAR" },
        }),
      );
      await adapter.getRates(sampleInput());
      const [url] = lastCall();
      expect(url).toContain(
        "/RateCalculator/Service_1_0.svc/json/CalculateRate",
      );
    });

    test("FetchCities hits the Location service", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [], Cities: [] }),
      );
      await adapter.getCities();
      const [url] = lastCall();
      expect(url).toContain("/Location/Service_1_0.svc/json/FetchCities");
    });
  });

  describe("mode → host selection", () => {
    test("production mode targets ws.aramex.net", async () => {
      const prod = new AramexAdapter({ mode: "production", credentials });
      mockFetch.mockResolvedValueOnce(createOk());
      await prod.createShipment(sampleInput());
      const [url] = lastCall();
      expect(url).toContain("https://ws.aramex.net/");
      expect(url).not.toContain("ws.dev.aramex.net");
    });

    test("locationBaseUrl override is honored", async () => {
      const custom = new AramexAdapter({
        mode: "production",
        credentials,
        locationBaseUrl: "https://anfe02.aramex.com/ShippingAPI.V2/Location/Service_1_0.svc",
      });
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [], Cities: [] }),
      );
      await custom.getCities();
      const [url] = lastCall();
      expect(url).toContain("anfe02.aramex.com");
    });
  });

  describe("auth", () => {
    test("every request carries ClientInfo in the body and no auth header", async () => {
      mockFetch.mockResolvedValueOnce(createOk());
      await adapter.createShipment(sampleInput());
      const [, init] = lastCall();
      expect(JSON.parse(init.body as string).ClientInfo.AccountNumber).toBe(
        "12345",
      );
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    test("source and version are configurable", async () => {
      const custom = new AramexAdapter({
        mode: "sandbox",
        credentials,
        source: 3,
        version: "1.0",
      });
      mockFetch.mockResolvedValueOnce(createOk());
      await custom.createShipment(sampleInput());
      const ci = JSON.parse(lastCall()[1].body as string).ClientInfo;
      expect(ci.Source).toBe(3);
      expect(ci.Version).toBe("1.0");
    });
  });

  describe("pickups", () => {
    test("createPickup posts to CreatePickup and returns the GUID as id", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          ProcessedPickup: { ID: "1", GUID: "abc-guid-123" },
        }),
      );

      const pickup = await adapter.createPickup(samplePickup());

      const [url, init] = lastCall();
      expect(url).toContain("/Shipping/Service_1_0.svc/json/CreatePickup");
      expect(JSON.parse(init.body as string).Pickup.PickupContact.PersonName).toBe(
        "Store Manager",
      );
      expect(pickup.id).toBe("abc-guid-123");
      expect(pickup.carrier).toBe("aramex");
    });

    test("createPickup throws on a fake-200 body with no usable pickup id", async () => {
      // HasErrors:false but an empty ProcessedPickup — success must be judged
      // from the body payload (GUID/ID), not the HTTP 200 status.
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [], ProcessedPickup: {} }),
      );

      await expect(adapter.createPickup(samplePickup())).rejects.toThrow(
        APIError,
      );
    });

    test("cancelPickup posts the GUID and reports success from HasErrors:false", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [] }),
      );

      const ok = await adapter.cancelPickup("abc-guid-123");

      const [url, init] = lastCall();
      expect(url).toContain("/Shipping/Service_1_0.svc/json/CancelPickup");
      expect(JSON.parse(init.body as string).PickupGUID).toBe("abc-guid-123");
      expect(ok).toBe(true);
    });
  });

  describe("unsupported operations", () => {
    test("cancelShipment throws UnsupportedOperationError", () => {
      expect(() => adapter.cancelShipment("AWB1")).toThrow(
        UnsupportedOperationError,
      );
    });
  });
});
