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
  setSystemTime,
  test,
} from "bun:test";
import { SMSAExpressAdapter } from "../../src/carriers/smsaexpress";
import { APIError, RateLimitError } from "../../src/core/errors";
import type { CreateShipmentInput } from "../../src/core/types";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

/** Mock response for the SA cities lookup consumed by booking-time city validation */
const smsaCitiesLookup = () =>
  new Response(
    JSON.stringify([
      { cityName: "Riyadh", cityCode: "RUH", countryCode: "SA", currencyCode: "SAR", currencyName: "Saudi Riyal" },
      { cityName: "Jeddah", cityCode: "JED", countryCode: "SA", currencyCode: "SAR", currencyName: "Saudi Riyal" },
      { cityName: "Dammam", cityCode: "DMM", countryCode: "SA", currencyCode: "SAR", currencyName: "Saudi Riyal" },
    ]),
    { headers: { "content-type": "application/json" } },
  );


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

/** Minimal valid domestic (SA→SA) shipment input with no reference. */
const baseInput = (): CreateShipmentInput => ({
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
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
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
    test("createShipment without a serviceType routes to B2C and omits ServiceCode", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
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
        // no serviceType — ServiceCode is optional per SMSA docs
      };

      const result = await adapter.createShipment(input);

      const calls = mockFetch.mock.calls;
      const [url, init] = calls[calls.length - 1] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toContain("/api/shipment/b2c/new");
      expect(result.trackingNumber).toBe("290000000001");
      const body = JSON.parse(init.body as string);
      // Do not invent EDDL — account-default product applies when omitted.
      expect(body.ServiceCode).toBeUndefined();
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
          // Empty Scans array must not crash the mapper.
          Scans: [],
        },
      ];

      const event = adapter.parseWebhook(payload);
      expect(event.status).toBe("unknown");
      expect(event.statusCode).toBe("unknown");
    });

    test("webhook with an omitted Scans key is accepted (only AWB is required)", () => {
      // A freshly-booked webhook record may omit Scans entirely. Validation must
      // require only AWB (used as trackingNumber), not Scans — every mapper
      // already defends with `Scans ?? []`.
      const payload = [
        {
          AWB: "290000000002",
          Reference: "REF-2",
          Pieces: 1,
          CODAmount: 0,
          // NOTE: no `Scans` key at all.
        },
      ];

      const event = adapter.parseWebhook(payload);
      expect(event.trackingNumber).toBe("290000000002");
      expect(event.status).toBe("unknown");
      expect(event.statusCode).toBe("unknown");

      // A record missing AWB is still rejected.
      expect(() => adapter.parseWebhook([{ Reference: "no-awb" }])).toThrow(
        "missing required field (AWB)",
      );
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
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
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
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(b2cResponse());

      const result = await adapter.createShipment(codCurrencyInput());

      expect(lastBody().ShipmentCurrency).toBe("AED");
      expect(result.currency).toBe("AED");
    });

    test("C2B uses cod.currency over declaredValue.currency", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(b2cResponse());

      await adapter.createShipment({
        ...codCurrencyInput(),
        serviceType: "EDCR",
      });

      expect(lastBody().ShipmentCurrency).toBe("AED");
    });

    test("disabled COD falls back to declaredValue.currency", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
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
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
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

  // ==========================================================================
  // FIX #1 — cancelShipment must not false-positive on negated messages
  // ==========================================================================

  describe("cancelShipment negation-aware success detection", () => {
    const cancelResponse = (message: string) =>
      new Response(JSON.stringify(message), {
        headers: { "content-type": "application/json" },
      });

    // Each of these contains "cancel"/"cancelled" (so a bare
    // includes("cancelled") wrongly returned true pre-fix) but is negated, so
    // it must now throw an APIError rather than report success.
    for (const message of [
      "Shipment cannot be cancelled",
      "Shipment can not be cancelled",
      "Shipment not cancelled",
      "Cancellation failed",
      "Cancellation request rejected",
      "Unable to cancel shipment",
      "Invalid shipment: cannot cancel",
      "Error: shipment cancellation not allowed",
    ]) {
      test(`throws on negated cancel message: "${message}"`, async () => {
        mockFetch.mockResolvedValueOnce(cancelResponse(message));

        await expect(adapter.cancelShipment("290000000001")).rejects.toThrow(
          APIError,
        );
      });
    }

    test('"already cancelled" reports idempotent success (no negation token)', async () => {
      mockFetch.mockResolvedValueOnce(
        cancelResponse("Shipment already cancelled"),
      );

      const result = await adapter.cancelShipment("290000000001");
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // FIX #2 — getLabel must propagate rate-limit errors, not swallow them
  // ==========================================================================

  describe("getLabel rate-limit handling", () => {
    test("propagates a 429 rate-limit instead of swallowing it into 'No label found'", async () => {
      const rateLimited = () =>
        new Response(JSON.stringify({ message: "Too Many Requests" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        });
      // GET retries by default (initial + 2 retries); every attempt is a 429.
      mockFetch.mockResolvedValueOnce(rateLimited());
      mockFetch.mockResolvedValueOnce(rateLimited());
      mockFetch.mockResolvedValueOnce(rateLimited());

      await expect(adapter.getLabel("290000000001")).rejects.toThrow(
        RateLimitError,
      );
      // Must NOT fall through to the C2B query path after a throttle
      // (3 = initial + 2 retries on the B2C path).
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // FIX #3 — ShipDate must reflect the Saudi (UTC+3) wall clock, not UTC
  // ==========================================================================

  describe("ShipDate UTC+3 wall clock", () => {
    test("ShipDate rolls to the next day when Saudi wall clock has, near end-of-day UTC", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      // 23:30 UTC on the 7th is already 02:30 on the 8th in Saudi (UTC+3). SMSA
      // reads bare timestamps as UTC+3, so the ship date must be the 8th, not
      // the 7th that zero-offset UTC would have produced.
      setSystemTime(new Date("2026-07-07T23:30:00.000Z"));
      try {
        mockFetch.mockResolvedValueOnce(b2cResponse());

        await adapter.createShipment(baseInput());

        expect(lastBody().ShipDate).toBe("2026-07-08T02:30:00");
      } finally {
        setSystemTime();
      }
    });
  });

  // ==========================================================================
  // FIX #10 — a fabricated OrderNumber must be surfaced as Shipment.reference
  // ==========================================================================

  describe("fabricated OrderNumber surfaced as reference", () => {
    test("returns the booked OrderNumber as Shipment.reference when no reference is supplied", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(b2cResponse());

      // baseInput() carries no reference — the adapter must fabricate one.
      const result = await adapter.createShipment(baseInput());

      const orderNumber = lastBody().OrderNumber;
      // The request was booked under a generated ORD-<timestamp> order number...
      expect(orderNumber).toBeDefined();
      expect(orderNumber).toMatch(/^ORD-\d+$/);
      // ...and that exact value must come back as the shipment reference so the
      // caller can later trackByReference.
      expect(result.reference).toBeDefined();
      expect(result.reference).toBe(orderNumber);
    });
  });
});
