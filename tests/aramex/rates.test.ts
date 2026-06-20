// file: tests/aramex/rates.test.ts
/**
 * Aramex Rate Calculator Tests
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
import { APIError } from "../../src/core/errors";
import type { CreateShipmentInput } from "../../src/core/types";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const input = (): CreateShipmentInput => ({
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
  parcels: [{ weight: { value: 2, unit: "kg" }, pieces: 1 }],
});

describe("AramexAdapter — rates", () => {
  let adapter: AramexAdapter;

  beforeAll(() => {
    globalThis.fetch = mockFetch as any;
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });
  beforeEach(() => {
    mockFetch.mockReset();
    adapter = new AramexAdapter({
      mode: "sandbox",
      credentials: {
        userName: "test@user.com",
        password: "secret",
        accountNumber: "12345",
        accountPin: "9999",
        accountEntity: "RUH",
        accountCountryCode: "SA",
      },
    });
  });

  test("returns a rate from CalculateRate", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        TotalAmount: { Value: 35.5, CurrencyCode: "SAR" },
        RateDetails: { Amount: 30, TaxAmount: 5.5 },
      }),
    );

    const rates = await adapter.getRates(input());

    expect(rates).toHaveLength(1);
    expect(rates[0]!.carrier).toBe("aramex");
    expect(rates[0]!.amount).toBe(35.5);
    expect(rates[0]!.currency).toBe("SAR");

    const [url, init] = mockFetch.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain(
      "/RateCalculator/Service_1_0.svc/json/CalculateRate",
    );
    const body = JSON.parse(init.body as string);
    expect(body.ClientInfo.AccountNumber).toBe("12345");
    expect(body.OriginAddress.City).toBe("Riyadh");
    expect(body.DestinationAddress.City).toBe("Jeddah");
    expect(body.ShipmentDetails.ActualWeight).toEqual({
      Value: 2,
      Unit: "Kg",
    });
  });

  test("throws when the response has no TotalAmount instead of returning a 0 rate", async () => {
    mockFetch.mockResolvedValueOnce(
      json({ HasErrors: false, Notifications: [], RateDetails: {} }),
    );

    const error = await adapter.getRates(input()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).message).toContain("no rate");
  });
});
