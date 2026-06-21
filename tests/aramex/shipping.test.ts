// file: tests/aramex/shipping.test.ts
/**
 * Aramex Shipping Tests
 * Uses mocked fetch to test adapter logic without network calls.
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
import {
  APIError,
  UnsupportedOperationError,
  ValidationError,
} from "../../src/core/errors";
import type { CreateShipmentInput } from "../../src/core/types";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const createOk = (overrides?: Record<string, unknown>) =>
  json({
    HasErrors: false,
    Notifications: [],
    Shipments: [
      {
        ID: "47384200001",
        HasErrors: false,
        Notifications: [],
        ShipmentLabel: {
          LabelURL: "https://www.aramex.com/labels/47384200001.pdf",
        },
        ...overrides,
      },
    ],
  });

const baseInput = (): CreateShipmentInput => ({
  shipper: {
    name: "Test Store",
    company: "ShipFlow",
    phone: "966501234567",
    email: "store@test.com",
    line1: "King Fahd Road",
    neighbourhood: "Al Olaya",
    city: "Riyadh",
    postalCode: "12211",
    countryCode: "SA",
  },
  consignee: {
    name: "Ahmed",
    phone: "966509876543",
    line1: "Prince Sultan Road",
    city: "Jeddah",
    countryCode: "SA",
  },
  parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
});

function firstCall(): [string, RequestInit] {
  return mockFetch.mock.calls[0] as unknown as [string, RequestInit];
}

describe("AramexAdapter — shipping", () => {
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
      companyName: "ShipFlow Co",
    });
  });

  describe("createShipment", () => {
    test("creates a shipment successfully", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      const result = await adapter.createShipment(baseInput());

      expect(result.trackingNumber).toBe("47384200001");
      expect(result.carrier).toBe("aramex");
      expect(result.status).toBe("created");
      expect(result.labelUrl).toContain(".pdf");

      const [url] = firstCall();
      expect(url).toContain(
        "/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CreateShipments",
      );
    });

    test("injects ClientInfo into the request body and sets no auth header", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      await adapter.createShipment(baseInput());

      const [, init] = firstCall();
      const body = JSON.parse(init.body as string);
      expect(body.ClientInfo.UserName).toBe("test@user.com");
      expect(body.ClientInfo.AccountNumber).toBe("12345");
      expect(body.ClientInfo.AccountPin).toBe("9999");
      expect(body.ClientInfo.AccountEntity).toBe("RUH");
      expect(body.ClientInfo.AccountCountryCode).toBe("SA");
      expect(body.ClientInfo.Source).toBe(24);
      expect(body.ClientInfo.Version).toBe("v1.0");

      // Aramex auth is in the body, never in headers.
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      expect(headers.apikey).toBeUndefined();
    });

    test("throws APIError on envelope-level HasErrors (Fake 200 OK)", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: true,
          Notifications: [
            { Code: "ERR01", Message: "Invalid account credentials" },
          ],
          Shipments: [],
        }),
      );

      const error = await adapter
        .createShipment(baseInput())
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(APIError);
      expect((error as APIError).message).toContain(
        "Invalid account credentials",
      );
    });

    test("throws APIError on per-shipment HasErrors even when envelope is clean", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          Shipments: [
            {
              ID: "",
              HasErrors: true,
              Notifications: [
                { Code: "ERR42", Message: "COD not allowed for this account" },
              ],
            },
          ],
        }),
      );

      await expect(adapter.createShipment(baseInput())).rejects.toThrow(
        "COD not allowed",
      );
    });

    test("maps COD into CashOnDeliveryAmount + CODS service, keeping freight prepaid (P)", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      await adapter.createShipment({
        ...baseInput(),
        cod: { enabled: true, amount: 150, currency: "SAR" },
      });

      const [, init] = firstCall();
      const details = JSON.parse(init.body as string).Shipments[0].Details;
      expect(details.CashOnDeliveryAmount).toEqual({
        Value: 150,
        CurrencyCode: "SAR",
      });
      // COD is the cash collected for the goods (CODS service), independent of
      // who pays freight. Freight stays prepaid so the customer isn't charged
      // shipping at the door on top of COD (KSA/GCC e-commerce norm).
      expect(details.PaymentType).toBe("P");
      expect(details.Services.split(",")).toContain("CODS");
    });

    test("freight PaymentType is overridable via metadata even with COD", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      await adapter.createShipment({
        ...baseInput(),
        cod: { enabled: true, amount: 150, currency: "SAR" },
        options: { metadata: { paymentType: "C" } },
      });

      const [, init] = firstCall();
      const details = JSON.parse(init.body as string).Shipments[0].Details;
      expect(details.PaymentType).toBe("C");
    });

    test("infers domestic ProductGroup/Type for same-country shipments", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      await adapter.createShipment(baseInput());

      const [, init] = firstCall();
      const details = JSON.parse(init.body as string).Shipments[0].Details;
      expect(details.ProductGroup).toBe("DOM");
      expect(details.ProductType).toBe("OND");
      expect(details.PaymentType).toBe("P");
    });

    test("infers express ProductGroup/Type for cross-border shipments", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      const input = baseInput();
      input.consignee.countryCode = "AE";
      input.consignee.city = "Dubai";
      await adapter.createShipment(input);

      const [, init] = firstCall();
      const details = JSON.parse(init.body as string).Shipments[0].Details;
      expect(details.ProductGroup).toBe("EXP");
      expect(details.ProductType).toBe("EPX");
    });

    test("requests INSR with an InsuranceAmount when insured and a declared value is set", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      await adapter.createShipment({
        ...baseInput(),
        declaredValue: { amount: 500, currency: "SAR" },
        options: { isInsured: true },
      });

      const [, init] = firstCall();
      const details = JSON.parse(init.body as string).Shipments[0].Details;
      expect(details.Services.split(",")).toContain("INSR");
      expect(details.InsuranceAmount).toEqual({
        Value: 500,
        CurrencyCode: "SAR",
      });
    });

    test("does NOT request INSR when insured but no declared value (Aramex rejects a null InsuranceAmount)", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      await adapter.createShipment({
        ...baseInput(),
        options: { isInsured: true },
      });

      const [, init] = firstCall();
      const details = JSON.parse(init.body as string).Shipments[0].Details;
      // No declared value → no insured amount → service must be omitted.
      expect(details.Services ?? "").not.toContain("INSR");
      expect(details.InsuranceAmount).toBeNull();
    });

    test("never sends the non-API Items field", async () => {
      mockFetch.mockResolvedValueOnce(createOk());

      await adapter.createShipment(baseInput());

      const [, init] = firstCall();
      const details = JSON.parse(init.body as string).Shipments[0].Details;
      expect("Items" in details).toBe(false);
    });
  });

  describe("createBulkShipments", () => {
    const bulkOk = () =>
      json({
        HasErrors: false,
        Notifications: [],
        Shipments: [
          { ID: "AWB-1", HasErrors: false, Notifications: [] },
          { ID: "AWB-2", HasErrors: false, Notifications: [] },
        ],
      });

    test("posts a multi-element Shipments array to the batch endpoint", async () => {
      mockFetch.mockResolvedValueOnce(bulkOk());

      const results = await adapter.createBulkShipments([
        baseInput(),
        baseInput(),
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]!.trackingNumber).toBe("AWB-1");
      expect(results[1]!.trackingNumber).toBe("AWB-2");

      const [url, init] = firstCall();
      expect(url).toContain("/Shipping/Service_1_0.svc/json/CreateShipments");
      expect(JSON.parse(init.body as string).Shipments).toHaveLength(2);
    });

    test("throws ValidationError on an empty batch", () => {
      expect(adapter.createBulkShipments([])).rejects.toThrow(ValidationError);
    });

    test("fails loud when any shipment in the batch errors", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          Shipments: [
            { ID: "AWB-1", HasErrors: false, Notifications: [] },
            {
              ID: "",
              HasErrors: true,
              Notifications: [
                { Code: "ERR42", Message: "Invalid consignee city" },
              ],
            },
          ],
        }),
      );

      const error = await adapter
        .createBulkShipments([baseInput(), baseInput()])
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(APIError);
      expect((error as APIError).message).toContain("Invalid consignee city");
    });
  });

  describe("getLabel", () => {
    test("returns the label URL from PrintLabel", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          ShipmentNumber: "47384200001",
          ShipmentLabel: {
            LabelURL: "https://www.aramex.com/labels/47384200001.pdf",
          },
        }),
      );

      const url = await adapter.getLabel("47384200001");
      expect(url).toBe("https://www.aramex.com/labels/47384200001.pdf");

      const [reqUrl, init] = firstCall();
      expect(reqUrl).toContain("/Shipping/Service_1_0.svc/json/PrintLabel");
      expect(JSON.parse(init.body as string).ShipmentNumber).toBe(
        "47384200001",
      );
    });
  });

  describe("cancelShipment", () => {
    test("throws UnsupportedOperationError (no Aramex cancel endpoint)", () => {
      expect(() => adapter.cancelShipment("47384200001")).toThrow(
        UnsupportedOperationError,
      );
    });
  });
});
