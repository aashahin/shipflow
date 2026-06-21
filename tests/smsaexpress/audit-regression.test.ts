// file: tests/smsaexpress/audit-regression.test.ts
/**
 * SMSA Express Audit Regression Tests
 * Locks in fixes from the carrier-API audit: plain-text response handling and
 * the ShortCode consignee-only restriction. Each test is written to FAIL
 * against the pre-audit code, so it genuinely guards the fix.
 * Uses mocked fetch — no network calls.
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
import { SMSAExpressAdapter } from "../../src/carriers/smsaexpress";
import { APIError } from "../../src/core/errors";
import type { CreateShipmentInput } from "../../src/core/types";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const b2cResponse = () =>
  new Response(
    JSON.stringify({
      sawb: "290000000000",
      createDate: "2026-04-02T10:00:00",
      shipmentParcelsCount: 1,
      waybills: [{ awb: "290000000001", awbFile: "base64..." }],
    }),
    { headers: { "content-type": "application/json" } },
  );

function lastBody(): any {
  const calls = mockFetch.mock.calls;
  const [, init] = calls[calls.length - 1] as unknown as [string, RequestInit];
  return JSON.parse(init.body as string);
}

describe("SMSA audit regression", () => {
  let adapter: SMSAExpressAdapter;

  beforeAll(() => {
    globalThis.fetch = mockFetch as any;
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });
  beforeEach(() => {
    mockFetch.mockReset();
    adapter = new SMSAExpressAdapter({
      mode: "sandbox",
      credentials: { apiKey: "test-api-key" },
    });
  });

  describe("plain-text (text/plain) response bodies", () => {
    test("cancelShipment rejects a non-cancel plain-text body (never reports success)", async () => {
      // Pre-audit, a text/plain body was wrapped as { text } (an object), so the
      // `typeof === string` branch was skipped and cancellation wrongly reported
      // success. The content here does NOT contain "cancelled", so it must be
      // reported as a failure — now an APIError (previously `false`) so a B2C /
      // no-op cancel is never seen as a success.
      mockFetch.mockResolvedValueOnce(
        new Response("Shipment not found or already processed", {
          headers: { "content-type": "text/plain" },
        }),
      );

      await expect(adapter.cancelShipment("290000000001")).rejects.toThrow(
        APIError,
      );
    });

    test("cancelShipment returns true for a plain-text success body", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("Shipment Cancelled Successfully!", {
          headers: { "content-type": "text/plain" },
        }),
      );

      const result = await adapter.cancelShipment("290000000001");
      expect(result).toBe(true);
    });

    test("sendInvoice returns the plain-text body as a string", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("Invoice logged successfully", {
          headers: { "content-type": "text/plain" },
        }),
      );

      const result = await adapter.sendInvoice({
        AWB: "290000000001",
        Currency: "SAR",
        InvoiceDate: "2026-01-22",
        Items: [],
        WeightUnit: "KG",
      });

      expect(result).toBe("Invoice logged successfully");
    });
  });

  describe("ShortCode consignee-only restriction", () => {
    test("does not emit ShortCode on ShipperAddress", async () => {
      mockFetch.mockResolvedValueOnce(b2cResponse());

      const input: CreateShipmentInput = {
        shipper: {
          name: "Shipper",
          phone: "966500000000",
          line1: "A",
          city: "Riyadh",
          countryCode: "SA",
          nationalAddress: { shortCode: "SHIP1111" },
        },
        consignee: {
          name: "Consignee",
          phone: "966500000001",
          line1: "B",
          city: "Jeddah",
          countryCode: "SA",
          nationalAddress: { shortCode: "RRRD2929" },
        },
        parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
        serviceType: "EDDL",
      };

      await adapter.createShipment(input);

      const body = lastBody();
      expect(body.ConsigneeAddress.ShortCode).toBe("RRRD2929");
      expect(body.ShipperAddress.ShortCode).toBeUndefined();
    });
  });

  describe("serviceType is optional", () => {
    test("createShipment without a serviceType routes to B2C", async () => {
      mockFetch.mockResolvedValueOnce(b2cResponse());

      const input: CreateShipmentInput = {
        shipper: {
          name: "Shipper",
          phone: "966500000000",
          line1: "A",
          city: "Riyadh",
          countryCode: "SA",
        },
        consignee: {
          name: "Consignee",
          phone: "966500000001",
          line1: "B",
          city: "Jeddah",
          countryCode: "SA",
        },
        parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
        // no serviceType
      };

      const result = await adapter.createShipment(input);

      const calls = mockFetch.mock.calls;
      const [url] = calls[calls.length - 1] as unknown as [string, RequestInit];
      expect(url).toContain("/api/shipment/b2c/new");
      expect(result.trackingNumber).toBe("290000000001");
    });
  });

  // ==========================================================================
  // SCAN-LESS RECORDS (omitted `Scans` must not throw)
  // ==========================================================================

  describe("scan-less tracking records (omitted Scans)", () => {
    const trackResponse = (extra: Record<string, unknown>) =>
      new Response(
        JSON.stringify({
          AWB: "290000000001",
          Reference: "",
          Pieces: 1,
          CODAmount: 0,
          // NOTE: no `Scans` key at all — a freshly-booked AWB before any scan.
          ...extra,
        }),
        { headers: { "content-type": "application/json" } },
      );

    test("track() yields 'unknown' instead of throwing", async () => {
      mockFetch.mockResolvedValueOnce(trackResponse({ AWB: "290000000099" }));

      const result = await adapter.track("290000000099");

      expect(result.status).toBe("unknown");
      expect(result.statusLabel).toBe("Unknown");
      expect(result.events).toEqual([]);
      expect(result.deliveryDate).toBeUndefined();
    });

    test("a scan-less record does not fail the whole trackMultiple batch", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            // First record omits Scans entirely (partial bulk record).
            {
              AWB: "290000000001",
              Reference: "REF1",
              Pieces: 1,
              CODAmount: 0,
            },
            // Second record has a normal scan.
            {
              AWB: "290000000002",
              Reference: "REF2",
              Pieces: 1,
              CODAmount: 0,
              Scans: [
                {
                  City: "Riyadh",
                  ScanType: "OD",
                  ScanDescription: "Out for Delivery",
                  ScanDateTime: "2026-04-02T10:00:00",
                  ScanTimeZone: "+03:00",
                },
              ],
            },
          ]),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const results = await adapter.trackMultiple([
        "290000000001",
        "290000000002",
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]!.status).toBe("unknown");
      expect(results[0]!.events).toEqual([]);
      expect(results[1]!.status).toBe("out_for_delivery");
    });

    test("webhook with a scan-less shipment yields 'unknown'", () => {
      const payload = [
        {
          AWB: "290000000001",
          Reference: "",
          Pieces: 1,
          CODAmount: 0,
          // Webhook validation requires the Scans key to exist; an empty array
          // (or, defensively, a missing one) must not crash the mapper.
          Scans: [],
        },
      ];

      const event = adapter.parseWebhook(payload);
      expect(event.status).toBe("unknown");
      expect(event.statusCode).toBe("unknown");
    });
  });

  // ==========================================================================
  // MISSING createDate (never build Invalid Date)
  // ==========================================================================

  describe("missing createDate", () => {
    const inputWithoutRef = (): CreateShipmentInput => ({
      shipper: {
        name: "Shipper",
        phone: "966500000000",
        line1: "A",
        city: "Riyadh",
        countryCode: "SA",
      },
      consignee: {
        name: "Consignee",
        phone: "966500000001",
        line1: "B",
        city: "Jeddah",
        countryCode: "SA",
      },
      parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
    });

    test("falls back to a valid Date when createDate is absent", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            // no createDate
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000001", awbFile: "base64..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.createShipment(inputWithoutRef());

      // Pre-fix this built `new Date("undefined+03:00")` = Invalid Date.
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(Number.isNaN(result.createdAt.getTime())).toBe(false);
    });
  });

  // ==========================================================================
  // COD CURRENCY PRECEDENCE (cod.currency must win when COD is enabled)
  // ==========================================================================

  describe("COD currency precedence", () => {
    const codCurrencyInput = (): CreateShipmentInput => ({
      shipper: {
        name: "Shipper",
        phone: "966500000000",
        line1: "A",
        city: "Riyadh",
        countryCode: "SA",
      },
      consignee: {
        name: "Consignee",
        phone: "966500000001",
        line1: "B",
        city: "Jeddah",
        countryCode: "SA",
      },
      parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
      cod: { enabled: true, amount: 100, currency: "AED" },
      declaredValue: { amount: 100, currency: "SAR" },
    });

    test("B2C uses cod.currency over declaredValue.currency", async () => {
      mockFetch.mockResolvedValueOnce(b2cResponse());

      const result = await adapter.createShipment(codCurrencyInput());

      expect(lastBody().ShipmentCurrency).toBe("AED");
      expect(result.currency).toBe("AED");
    });

    test("C2B uses cod.currency over declaredValue.currency", async () => {
      mockFetch.mockResolvedValueOnce(b2cResponse());

      await adapter.createShipment({
        ...codCurrencyInput(),
        serviceType: "EDCR",
      });

      expect(lastBody().ShipmentCurrency).toBe("AED");
    });

    test("disabled COD falls back to declaredValue.currency", async () => {
      mockFetch.mockResolvedValueOnce(b2cResponse());

      const result = await adapter.createShipment({
        ...codCurrencyInput(),
        cod: { enabled: false, amount: 0, currency: "AED" },
      });

      expect(lastBody().ShipmentCurrency).toBe("SAR");
      expect(result.currency).toBe("SAR");
    });
  });

  // ==========================================================================
  // WEIGHT ROUNDING (avoid float noise like 0.30000000000000004)
  // ==========================================================================

  describe("weight rounding", () => {
    test("rounds totalWeight to 3 decimals", async () => {
      mockFetch.mockResolvedValueOnce(b2cResponse());

      await adapter.createShipment({
        shipper: {
          name: "Shipper",
          phone: "966500000000",
          line1: "A",
          city: "Riyadh",
          countryCode: "SA",
        },
        consignee: {
          name: "Consignee",
          phone: "966500000001",
          line1: "B",
          city: "Jeddah",
          countryCode: "SA",
        },
        // 0.1 + 0.2 = 0.30000000000000004 without rounding.
        parcels: [
          { weight: { value: 0.1, unit: "kg" }, pieces: 1 },
          { weight: { value: 0.2, unit: "kg" }, pieces: 1 },
        ],
      });

      expect(lastBody().Weight).toBe(0.3);
    });
  });
});
