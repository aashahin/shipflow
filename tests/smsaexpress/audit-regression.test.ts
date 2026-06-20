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
    test("cancelShipment returns false for a non-cancel plain-text body", async () => {
      // Pre-audit, a text/plain body was wrapped as { text } (an object), so the
      // `typeof === string` branch was skipped and cancellation wrongly reported
      // success. The content here does NOT contain "cancelled".
      mockFetch.mockResolvedValueOnce(
        new Response("Shipment not found or already processed", {
          headers: { "content-type": "text/plain" },
        }),
      );

      const result = await adapter.cancelShipment("290000000001");
      expect(result).toBe(false);
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
});
