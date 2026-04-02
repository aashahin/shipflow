// file: tests/aymakan/shipping.test.ts
/**
 * Aymakan Shipping Tests
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
import { AymakanAdapter, AymakanService } from "../../src/carriers/aymakan";
import { APIError, AuthenticationError } from "../../src/core/errors";
import type { CreateShipmentInput } from "../../src/core/types";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

/** Mock response for the /cities endpoint (used by city resolution) */
const citiesResponse = () =>
  new Response(
    JSON.stringify({
      success: true,
      data: {
        cities: [
          { city_en: "Riyadh", city_ar: "الرياض" },
          { city_en: "Jeddah", city_ar: "جدة" },
          { city_en: "Dammam", city_ar: "الدمام" },
        ],
      },
    }),
    { headers: { "content-type": "application/json" } },
  );

describe("AymakanAdapter", () => {
  let adapter: AymakanAdapter;

  beforeAll(() => {
    globalThis.fetch = mockFetch as any;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockReset();
    adapter = new AymakanAdapter({
      mode: (process.env.AYMAKAN_MODE ?? Bun.env.AYMAKAN_MODE ?? "sandbox") as
        | "sandbox"
        | "production",
      credentials: {
        apiKey:
          process.env.AYMAKAN_API_KEY ||
          Bun.env.AYMAKAN_API_KEY ||
          "test-api-key",
      },
    });
  });

  describe("createShipment", () => {
    const shipmentInput: CreateShipmentInput = {
      shipper: {
        name: "Test Store",
        phone: "966501234567",
        line1: "King Fahd Road",
        city: "Riyadh",
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
      serviceType: AymakanService.ECOMMERCE,
      cod: { enabled: true, amount: 150, currency: "SAR" },
      declaredValue: { amount: 150, currency: "SAR" },
    };

    test("creates shipment with COD successfully", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            shipping: {
              tracking_number: "AY1234567890",
              reference: null,
              status: "AY-0001",
              status_label: "AWB created at origin",
              cod_amount: 150,
              declared_value: 150,
              currency: "SAR",
              label: "https://dev.aymakan.com.sa/pdf/test.pdf",
              pdf_label: "https://dev.aymakan.com.sa/pdf/test.pdf",
              created_at: "2026-01-22T10:00:00.000000Z",
              delivery_name: "Ahmed",
              delivery_city: "Jeddah",
              collection_name: "Test Store",
              collection_city: "Riyadh",
              weight: 1,
              pieces: 1,
              is_reverse_pickup: 0,
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.createShipment(shipmentInput);

      expect(result.trackingNumber).toBe("AY1234567890");
      expect(result.status).toBe("created");
      expect(result.codAmount).toBe(150);
      expect(result.labelUrl).toContain(".pdf");
      expect(result.carrier).toBe("aymakan");
    });

    test("resolves Arabic city names to English for Aymakan", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            shipping: {
              tracking_number: "AY9999999999",
              reference: null,
              status: "AY-0001",
              status_label: "AWB created at origin",
              cod_amount: null,
              declared_value: 100,
              currency: "SAR",
              label: "",
              pdf_label: "",
              created_at: "2026-01-22T10:00:00.000000Z",
              delivery_name: "Ahmed",
              delivery_city: "Jeddah",
              collection_name: "Test Store",
              collection_city: "Riyadh",
              weight: 1,
              pieces: 1,
              is_reverse_pickup: 0,
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const arabicInput: CreateShipmentInput = {
        shipper: {
          name: "Test Store",
          phone: "966501234567",
          line1: "King Fahd Road",
          city: "الرياض", // Arabic
          countryCode: "SA",
        },
        consignee: {
          name: "Ahmed",
          phone: "966509876543",
          line1: "Street 1",
          city: "جدة", // Arabic
          countryCode: "SA",
        },
        parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
        serviceType: AymakanService.ECOMMERCE,
        declaredValue: { amount: 100, currency: "SAR" },
      };

      await adapter.createShipment(arabicInput);

      // Verify the fetch was called with English city names
      const createCall = mockFetch.mock.calls[1] as unknown as [
        string,
        RequestInit,
      ];
      const body = JSON.parse(createCall[1]?.body as string);
      expect(body.collection_city).toBe("Riyadh");
      expect(body.delivery_city).toBe("Jeddah");
    });

    test("handles validation errors", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "The given data was invalid.",
            errors: {
              delivery_phone: ["The delivery phone field is required."],
            },
          }),
          { status: 422, headers: { "content-type": "application/json" } },
        ),
      );

      await expect(adapter.createShipment(shipmentInput)).rejects.toThrow(
        APIError,
      );
    });

    test("handles authentication errors", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: true,
            response: "Invalid Credentials",
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        ),
      );

      await expect(adapter.createShipment(shipmentInput)).rejects.toThrow(
        AuthenticationError,
      );
    });
  });

  describe("track", () => {
    test("tracks single shipment", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              shipments: [
                {
                  tracking_number: "AY1234567890",
                  reference: "ORDER-123",
                  status: "AY-0005",
                  status_label: "Delivered",
                  cod_amount: "150.00",
                  weight: "1.00",
                  pieces: 1,
                  tracking_info: [
                    {
                      status_code: "AY-0005",
                      description: "Shipment is delivered to customer",
                      description_ar: "تم توصيل الشحنة",
                      created_at: "2026-01-22 14:00:00",
                    },
                    {
                      status_code: "AY-0004",
                      description: "Shipment is out for delivery",
                      description_ar: "الشحنة خارجة للتوصيل",
                      created_at: "2026-01-22 10:00:00",
                    },
                  ],
                },
              ],
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("AY1234567890");

      expect(result.trackingNumber).toBe("AY1234567890");
      expect(result.status).toBe("delivered");
      expect(result.reference).toBe("ORDER-123");
      expect(result.events).toHaveLength(2);
      expect(result.events[0]!.status).toBe("delivered");
    });
  });

  describe("cancelShipment", () => {
    test("cancels shipment successfully", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            shipping: { tracking_number: "AY1234567890", status: "cancelled" },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.cancelShipment("AY1234567890");
      expect(result).toBe(true);
    });
  });
});

describe("parseWebhook", () => {
  let adapter: AymakanAdapter;

  beforeEach(() => {
    adapter = new AymakanAdapter({
      mode: "sandbox",
      credentials: { apiKey: "test-api-key" },
    });
  });

  test("parses webhook payload correctly", () => {
    const payload = {
      tracking_number: "AY1234567890",
      reference: "ORDER-123",
      status: "AY-0005",
      status_label: "Delivered",
      reason_code: null,
      reason_en: null,
      date_time: "2026-01-22T14:00:00.000000Z",
      event: "status_update" as const,
      delivery_name: "Ahmed",
      delivery_city: "Jeddah",
      cod_amount: "150.00",
      pieces: 1,
      weight: "1.00",
      tracking_info: [],
    };

    const event = adapter.parseWebhook(payload);

    expect(event.trackingNumber).toBe("AY1234567890");
    expect(event.status).toBe("delivered");
    expect(event.eventType).toBe("status_update");
    expect(event.carrier).toBe("aymakan");
  });

  test("verifies webhook auth header", () => {
    const payload = {
      tracking_number: "AY123",
      status: "AY-0001",
      status_label: "Created",
      date_time: "2026-01-22T10:00:00Z",
      tracking_info: [],
    };

    expect(() =>
      adapter.parseWebhook(payload, {
        headers: { "x-aymakan-auth": "wrong-secret" },
        config: { authHeader: "X-Aymakan-Auth", authValue: "correct-secret" },
      }),
    ).toThrow("Invalid webhook auth header");
  });

  test("verifies webhook auth query param", () => {
    const payload = {
      tracking_number: "AY123",
      status: "AY-0001",
      status_label: "Created",
      date_time: "2026-01-22T10:00:00Z",
      tracking_info: [],
    };

    expect(() =>
      adapter.parseWebhook(payload, {
        queryParams: { secret: "wrong-secret" },
        config: { authQueryParam: "secret", authQueryValue: "correct-secret" },
      }),
    ).toThrow("Invalid webhook auth query param");
  });

  test("passes auth verification when credentials match", () => {
    const payload = {
      tracking_number: "AY123",
      status: "AY-0001",
      status_label: "Created",
      date_time: "2026-01-22T10:00:00Z",
      tracking_info: [],
    };

    const event = adapter.parseWebhook(payload, {
      headers: { "x-aymakan-auth": "correct-secret" },
      config: { authHeader: "X-Aymakan-Auth", authValue: "correct-secret" },
    });

    expect(event.trackingNumber).toBe("AY123");
  });
});
