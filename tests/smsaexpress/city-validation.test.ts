// file: tests/smsaexpress/city-validation.test.ts
/**
 * SMSA booking-time city normalization tests.
 *
 * The adapter normalizes cities found in SMSA's /api/lookup/cities list while
 * passing unmatched values through to booking because that lookup is not
 * exhaustive. Non-SA addresses remain untouched.
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

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const citiesLookup = () =>
  json([
    { cityName: "Riyadh", cityCode: "RUH", countryCode: "SA", currencyCode: "SAR", currencyName: "Saudi Riyal" },
    { cityName: "Jeddah", cityCode: "JED", countryCode: "SA", currencyCode: "SAR", currencyName: "Saudi Riyal" },
  ]);

const b2cResponse = () =>
  json({
    sawb: "290000000000",
    createDate: "2026-04-02T10:00:00",
    shipmentParcelsCount: 1,
    waybills: [{ awb: "290000000001", awbFile: "base64..." }],
  });

const baseInput = (): CreateShipmentInput => ({
  shipper: {
    name: "Shipper",
    phone: "966500000000",
    line1: "A",
    city: "Riyadh",
    countryCode: "SA",
  },
  consignee: {
    name: "Customer",
    phone: "966500000001",
    line1: "B",
    city: "Jeddah",
    countryCode: "SA",
  },
  parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
  serviceType: "EDDL",
});

function bookingCalls(): string[] {
  return mockFetch.mock.calls
    .map((c) => (c as unknown as [string])[0])
    .filter((u) => u.includes("/api/shipment/b2c/new"));
}

describe("SMSA booking-time city normalization", () => {
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

  test("normalizes a resolvable city to SMSA's English name before booking", async () => {
    mockFetch.mockResolvedValueOnce(citiesLookup());
    mockFetch.mockResolvedValueOnce(b2cResponse());

    const input = baseInput();
    await adapter.createShipment({
      ...input,
      consignee: { ...input.consignee, city: "  jeddah " },
    });

    const [, init] = mockFetch.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string);
    expect(body.ConsigneeAddress.City).toBe("Jeddah");
  });

  test("submits an unmatched SA city instead of blocking the booking", async () => {
    mockFetch.mockResolvedValueOnce(citiesLookup());
    mockFetch.mockResolvedValueOnce(b2cResponse());

    const input = baseInput();
    await adapter.createShipment({
      ...input,
      consignee: { ...input.consignee, city: "Atlantis" },
    });

    const [, init] = mockFetch.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string);
    expect(body.ConsigneeAddress.City).toBe("Atlantis");
    expect(bookingCalls()).toHaveLength(1);
  });

  test("passes the city through verbatim when the cities lookup is down", async () => {
    // 404 is not in the retryable-status set, so the lookup fails after a
    // single attempt and only consumes one queued mock.
    mockFetch.mockResolvedValueOnce(
      new Response("not found", { status: 404 }),
    );
    mockFetch.mockResolvedValueOnce(b2cResponse());

    const input = baseInput();
    await adapter.createShipment({
      ...input,
      consignee: { ...input.consignee, city: "Some Small Town" },
    });

    const calls = mockFetch.mock.calls;
    const [, init] = calls[calls.length - 1] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string);
    expect(body.ConsigneeAddress.City).toBe("Some Small Town");
  });

  test("does not validate non-SA addresses against the SA city list", async () => {
    mockFetch.mockResolvedValueOnce(citiesLookup());
    mockFetch.mockResolvedValueOnce(b2cResponse());

    const input = baseInput();
    await adapter.createShipment({
      ...input,
      consignee: {
        ...input.consignee,
        city: "Dubai",
        countryCode: "AE",
      },
    });

    const [, init] = mockFetch.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string);
    expect(body.ConsigneeAddress.City).toBe("Dubai");
  });

  test("caches the cities list across bookings on the same adapter", async () => {
    mockFetch.mockResolvedValueOnce(citiesLookup());
    mockFetch.mockResolvedValueOnce(b2cResponse());
    mockFetch.mockResolvedValueOnce(b2cResponse());

    await adapter.createShipment(baseInput());
    await adapter.createShipment(baseInput());

    const lookupCalls = mockFetch.mock.calls
      .map((c) => (c as unknown as [string])[0])
      .filter((u) => u.includes("/api/lookup/cities"));
    expect(lookupCalls).toHaveLength(1);
    expect(bookingCalls()).toHaveLength(2);
  });
});
