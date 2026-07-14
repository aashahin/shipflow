// file: tests/aymakan/audit-regression.test.ts
/**
 * Aymakan Audit Regression Tests
 * Locks in fixes from the carrier-API audit: endpoint paths, request/response
 * envelope shapes, and tracking-status derivation. Each test is written to FAIL
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
import { AymakanAdapter } from "../../src/carriers/aymakan";
import {
  APIError,
  ValidationError,
  WebhookVerificationError,
} from "../../src/core/errors";
import type { CreateShipmentInput } from "../../src/core/types";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const citiesResponse = () =>
  json({
    success: true,
    data: {
      cities: [
        { city_en: "Riyadh", city_ar: "الرياض" },
        { city_en: "Jeddah", city_ar: "جدة" },
      ],
    },
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
  serviceType: "ONP",
});

function lastCall(): [string, RequestInit] {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1] as unknown as [string, RequestInit];
}

describe("Aymakan audit regression", () => {
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
      mode: "sandbox",
      credentials: { apiKey: "test-api-key" },
    });
  });

  describe("track status derivation", () => {
    test("derives status from tracking_info when top-level status is a human label", async () => {
      // The /track endpoint returns a human-readable label in `status`, while
      // the AY codes live only in tracking_info[].status_code. The old code
      // mapped the label and always produced "unknown".
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          data: {
            shipments: [
              {
                tracking_number: "AY1",
                reference: null,
                status: "Received at Warehouse", // label, NOT an AY code
                status_label: "Received at Warehouse",
                cod_amount: null,
                weight: "1.00",
                pieces: 1,
                tracking_info: [
                  {
                    status_code: "AY-0003",
                    description: "received at hub",
                    description_ar: null,
                    created_at: "2026-01-22 12:00:00",
                  },
                  {
                    status_code: "AY-0002",
                    description: "collected",
                    description_ar: null,
                    created_at: "2026-01-22 09:00:00",
                  },
                ],
              },
            ],
          },
        }),
      );

      const result = await adapter.track("AY1");
      expect(result.status).not.toBe("unknown");
      expect(result.status).toBe("at_warehouse"); // latest event = AY-0003
    });
  });

  describe("createBulkShipments", () => {
    test("posts to /shipping/create/bulk_shipping with { shipments } and reads top-level shipments", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          total_shipments: 1,
          shipments: [
            {
              tracking_number: "AY100",
              reference: null,
              status: "AY-0001",
              status_label: "AWB created at origin",
              cod_amount: 0,
              declared_value: 1,
              currency: "SAR",
              created_at: "2026-01-22T10:00:00.000000Z",
              weight: 1,
              pieces: 1,
              is_reverse_pickup: 0,
              label: "",
              pdf_label: "",
            },
          ],
        }),
      );

      const result = await adapter.createBulkShipments([sampleInput()]);

      const [url, init] = lastCall();
      expect(url).toContain("/shipping/create/bulk_shipping");
      const body = JSON.parse(init.body as string);
      expect(Array.isArray(body.shipments)).toBe(true);
      expect(body.data).toBeUndefined();
      expect(result).toHaveLength(1);
      expect(result[0]!.trackingNumber).toBe("AY100");
    });

    test("rejects batches larger than 30 before issuing any request", async () => {
      const many = Array.from({ length: 31 }, sampleInput);
      await expect(adapter.createBulkShipments(many)).rejects.toThrow(
        ValidationError,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("cancelByReference", () => {
    test("POSTs to /shipping/cancel_by_reference with a { reference } body", async () => {
      mockFetch.mockResolvedValueOnce(json({ success: true, message: "ok" }));

      const ok = await adapter.cancelByReference("REF-1");

      const [url, init] = lastCall();
      expect(url).toContain("/shipping/cancel_by_reference");
      expect(url).not.toContain("/cancel/reference/");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ reference: "REF-1" });
      expect(ok).toBe(true);
    });
  });

  describe("getBulkLabels", () => {
    test("GETs /shipping/bulk_awb/trackings and returns bulk_awb_url", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ success: true, data: { bulk_awb_url: "https://x/pdf" } }),
      );

      const link = await adapter.getBulkLabels(["AY1", "AY2"]);

      const [url, init] = lastCall();
      expect(url).toContain("/shipping/bulk_awb/trackings/AY1,AY2");
      expect(init.method ?? "GET").toBe("GET");
      expect(link).toBe("https://x/pdf");
    });
  });

  describe("getPickupRequests", () => {
    test("GETs /pickup_request/list and reads data.pickupRequests.data", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          data: {
            pickupRequests: {
              current_page: 1,
              data: [
                {
                  id: 1,
                  customer_id: 2,
                  contact_name: "n",
                  contact_phone: "p",
                  address: "a",
                  shipments: 3,
                  time_slot: "morning",
                  pickup_date: "2026-01-22",
                  status: "completed",
                  created_at: "2026-01-22T10:00:00.000000Z",
                },
              ],
            },
          },
        }),
      );

      const result = await adapter.getPickupRequests();

      const [url] = lastCall();
      expect(url).toContain("/pickup_request/list");
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
      expect(result[0]!.status).toBe("completed");
    });
  });

  describe("cancelPickup", () => {
    test("POSTs the id in the body to /pickup_request/cancel", async () => {
      mockFetch.mockResolvedValueOnce(json({ success: true }));

      await adapter.cancelPickup(4021);

      const [url, init] = lastCall();
      expect(url).toMatch(/\/pickup_request\/cancel$/);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ pickup_request: 4021 });
    });
  });

  describe("customer addresses", () => {
    test("getCustomerAddresses GETs /address/list and reads data.address", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          data: {
            address: [
              {
                id: 75,
                title: "mr",
                name: "Muh",
                email: "a@b.c",
                city: "Riyadh",
                address: "x",
                postcode: "75760",
                neighbourhood: "Al Wizarat",
                phone: "5",
                country: "SA",
                description: "d",
              },
            ],
          },
        }),
      );

      const result = await adapter.getCustomerAddresses();

      const [url] = lastCall();
      expect(url).toContain("/address/list");
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(75);
      expect(result[0]!.postalCode).toBe("75760");
    });

    test("updateCustomerAddress PUTs /address/update with the id in the body", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          data: {
            address: {
              id: 1,
              title: "t",
              name: "n",
              email: "e",
              city: "Riyadh",
              address: "a",
              postcode: "1",
              neighbourhood: "x",
              phone: "p",
              country: "SA",
              description: "d",
            },
          },
        }),
      );

      await adapter.updateCustomerAddress(1, { title: "t" });

      const [url, init] = lastCall();
      expect(url).toMatch(/\/address\/update$/);
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body as string).id).toBe(1);
    });

    test("deleteCustomerAddress DELETEs /address/delete with the id in the body", async () => {
      mockFetch.mockResolvedValueOnce(json({ success: true }));

      await adapter.deleteCustomerAddress(2);

      const [url, init] = lastCall();
      expect(url).toMatch(/\/address\/delete$/);
      expect(init.method).toBe("DELETE");
      expect(JSON.parse(init.body as string)).toEqual({ id: 2 });
    });
  });

  describe("getDropoffLocations", () => {
    test("maps the flat data array and derives id from name", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          data: [
            {
              name: "RUH-WH",
              city: "Riyadh",
              address: "Sulay",
              location_lat: null,
              location_lng: null,
            },
          ],
        }),
      );

      const result = await adapter.getDropoffLocations();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("RUH-WH");
      expect(result[0]!.name).toBe("RUH-WH");
      expect(result[0]!.city).toBe("Riyadh");
    });
  });

  describe("webhook weight_update", () => {
    test("maps the carrier status for weight_update events instead of forcing unknown", () => {
      const event = adapter.parseWebhook({
        tracking_number: "AY5",
        reference: null,
        status: "AY-0005",
        status_label: "Delivered",
        reason_code: null,
        reason_en: null,
        date_time: "2026-01-22T10:00:00Z",
        event: "weight_update",
        tracking_info: [],
      });

      expect(event.eventType).toBe("weight_update");
      expect(event.status).toBe("delivered");
    });
  });

  // ==========================================================================
  // DEEP-REVIEW FIXES
  // ==========================================================================

  describe("COD vs declared value separation", () => {
    test("declared_value never falls back to the COD amount", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          shipping: {
            tracking_number: "AY200",
            reference: null,
            status: "AY-0001",
            status_label: "AWB created at origin",
            cod_amount: 150,
            declared_value: 0,
            currency: "SAR",
            created_at: "2026-01-22T10:00:00.000000Z",
            weight: 1,
            pieces: 1,
            is_reverse_pickup: 0,
            label: "",
            pdf_label: "",
          },
        }),
      );

      // COD is enabled with 150 but NO declaredValue is provided.
      await adapter.createShipment({
        ...sampleInput(),
        cod: { enabled: true, amount: 150, currency: "USD" },
      });

      const [, init] = lastCall();
      const body = JSON.parse(init.body as string);
      // declared_value must NOT borrow the COD amount.
      expect(body.declared_value).toBe(0);
      expect(body.declared_value_currency).toBe("SAR");
      expect(body.is_cod).toBe(1);
      expect(body.cod_amount).toBe(150);
      // Top-level currency prefers the COD currency when COD is enabled.
      expect(body.currency).toBe("USD");
    });

    test("uses declaredValue currency for top-level currency when COD is disabled", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          shipping: {
            tracking_number: "AY201",
            reference: null,
            status: "AY-0001",
            status_label: "AWB created at origin",
            cod_amount: null,
            declared_value: 99,
            currency: "USD",
            created_at: "2026-01-22T10:00:00.000000Z",
            weight: 1,
            pieces: 1,
            is_reverse_pickup: 0,
            label: "",
            pdf_label: "",
          },
        }),
      );

      await adapter.createShipment({
        ...sampleInput(),
        declaredValue: { amount: 99, currency: "USD" },
      });

      const [, init] = lastCall();
      const body = JSON.parse(init.body as string);
      expect(body.is_cod).toBe(0);
      expect(body.cod_amount).toBeUndefined();
      expect(body.declared_value).toBe(99);
      expect(body.declared_value_currency).toBe("USD");
      expect(body.currency).toBe("USD");
    });
  });

  describe("fake-200 error envelopes surface as APIError", () => {
    test("cancelShipment throws on a 200 error envelope instead of returning false", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ error: true, response: "Shipment cannot be cancelled" }),
      );

      const promise = adapter.cancelShipment("AY999");
      await expect(promise).rejects.toThrow(APIError);
      await expect(promise).rejects.toThrow("Shipment cannot be cancelled");
    });

    test("cancelByReference throws on a 200 error envelope", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ success: false, message: "Reference not found" }),
      );

      await expect(adapter.cancelByReference("REF-X")).rejects.toThrow(
        "Reference not found",
      );
    });

    test("cancelPickup throws on a 200 error envelope", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ error: true, message: "Pickup already cancelled" }),
      );

      await expect(adapter.cancelPickup(7)).rejects.toThrow(
        "Pickup already cancelled",
      );
    });

    test("a successful cancel still returns true", async () => {
      mockFetch.mockResolvedValueOnce(json({ success: true, message: "ok" }));
      expect(await adapter.cancelShipment("AY1")).toBe(true);
    });
  });

  describe("track human-label status fallback", () => {
    test("recovers a real status from the /track human label when there are no events", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          data: {
            shipments: [
              {
                tracking_number: "AY1",
                reference: null,
                status: "Received at Warehouse", // human label, no events
                status_label: "Received at Warehouse",
                cod_amount: null,
                weight: "1.00",
                pieces: 1,
                tracking_info: [],
              },
            ],
          },
        }),
      );

      const result = await adapter.track("AY1");
      expect(result.status).toBe("at_warehouse");
    });
  });

  describe("zero-COD handling on create", () => {
    test("a parsed COD of 0 yields undefined codAmount (not NaN-dropped)", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          shipping: {
            tracking_number: "AY300",
            reference: null,
            status: "AY-0001",
            status_label: "AWB created at origin",
            cod_amount: "0.00",
            declared_value: 50,
            currency: "SAR",
            created_at: "2026-01-22T10:00:00.000000Z",
            weight: 1,
            pieces: 1,
            is_reverse_pickup: 0,
            label: "",
            pdf_label: "",
          },
        }),
      );

      const shipment = await adapter.createShipment(sampleInput());
      expect(shipment.codAmount).toBeUndefined();
    });
  });

  describe("response shape guards", () => {
    test("createBulkShipments returns [] for empty input without any request", async () => {
      const result = await adapter.createBulkShipments([]);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test("createBulkShipments throws a clean APIError when shipments array is missing", async () => {
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(json({ success: true }));

      await expect(
        adapter.createBulkShipments([sampleInput()]),
      ).rejects.toThrow(APIError);
    });

    test("trackMultiple throws a clean APIError when data.shipments is missing", async () => {
      mockFetch.mockResolvedValueOnce(json({ success: true, data: {} }));

      await expect(adapter.trackMultiple(["AY1"])).rejects.toThrow(APIError);
    });

    test("getPickupRequests throws a clean APIError when nested data is missing", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ success: true, data: { pickupRequests: {} } }),
      );

      await expect(adapter.getPickupRequests()).rejects.toThrow(APIError);
    });
  });

  // ==========================================================================
  // FIX #4 — missing tracking_info must not crash the batch
  // ==========================================================================

  describe("track with missing tracking_info (FIX #4)", () => {
    test("a shipment record without a tracking_info field does not throw", async () => {
      // The old code called data.tracking_info.map(...) directly, which throws
      // a TypeError when a record omits tracking_info and fails the whole batch.
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          data: {
            shipments: [
              {
                tracking_number: "AY1",
                reference: null,
                status: "Received at Warehouse", // human label, no events
                status_label: "Received at Warehouse",
                cod_amount: null,
                weight: "1.00",
                pieces: 1,
                // tracking_info intentionally omitted
              },
            ],
          },
        }),
      );

      const result = await adapter.track("AY1");
      // Status is derived from the top-level human label, events are empty.
      expect(result.events).toEqual([]);
      expect(result.status).toBe("at_warehouse");
    });
  });

  // ==========================================================================
  // FIX #6 — contains-match must not reroute a distinct longer city
  // ==========================================================================

  describe("resolveCity contains-match guard (FIX #6)", () => {
    test("a distinct longer city is never silently rerouted to a shorter candidate", async () => {
      // Cities cache has "Riyadh" (and NOT "Riyadh Al Khabra"). The old step-5
      // reverse-direction match (input contains candidate name) rerouted
      // "Riyadh Al Khabra" -> "Riyadh". With strict booking-time validation it
      // must now be rejected outright — a clear ValidationError, never a
      // silent substitution and never an opaque carrier 400.
      mockFetch.mockResolvedValueOnce(citiesResponse());

      const input = sampleInput();
      const attempt = adapter.createShipment({
        ...input,
        consignee: { ...input.consignee, city: "Riyadh Al Khabra" },
      });

      await expect(attempt).rejects.toThrow(ValidationError);
      await expect(attempt).rejects.toThrow('city "Riyadh Al Khabra"');
      // Only the /cities lookup was called — no booking request went out.
      const urls = mockFetch.mock.calls.map(
        (c) => (c as unknown as [string])[0],
      );
      expect(urls.some((u) => u.includes("/shipping/create"))).toBe(false);
    });

    test("passes cities through verbatim when the /cities lookup is down", async () => {
      // Strictness must never turn a carrier /cities outage into a booking
      // outage: with no list available the adapter falls back to pass-through
      // and lets the API decide. 404 is not retryable, so exactly one queued
      // mock is consumed by the lookup.
      mockFetch.mockResolvedValueOnce(
        new Response("not found", { status: 404 }),
      );
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          shipping: {
            tracking_number: "AY401",
            reference: null,
            status: "AY-0001",
            status_label: "AWB created at origin",
            cod_amount: null,
            declared_value: 1,
            currency: "SAR",
            created_at: "2026-01-22T10:00:00.000000Z",
            weight: 1,
            pieces: 1,
            is_reverse_pickup: 0,
            label: "",
            pdf_label: "",
          },
        }),
      );

      const input = sampleInput();
      await adapter.createShipment({
        ...input,
        consignee: { ...input.consignee, city: "Riyadh Al Khabra" },
      });

      const [, init] = lastCall();
      const body = JSON.parse(init.body as string);
      expect(body.delivery_city).toBe("Riyadh Al Khabra");
    });

    test("a supported non-SA (GCC) consignee city bypasses the Saudi city list", async () => {
      // Aymakan serves other GCC countries whose cities are NOT in its Saudi
      // gazetteer (see supportedCountries). Strict validation is Saudi-only —
      // a non-SA consignee must pass through, mirroring the SMSA adapter, so an
      // e.g. AE "Dubai" booking is not rejected client-side while the cache is
      // loaded.
      mockFetch.mockResolvedValueOnce(citiesResponse());
      mockFetch.mockResolvedValueOnce(
        json({
          success: true,
          shipping: {
            tracking_number: "AY-AE",
            reference: null,
            status: "AY-0001",
            status_label: "AWB created at origin",
            cod_amount: null,
            declared_value: 1,
            currency: "SAR",
            created_at: "2026-01-22T10:00:00.000000Z",
            weight: 1,
            pieces: 1,
            is_reverse_pickup: 0,
            label: "",
            pdf_label: "",
          },
        }),
      );

      const input = sampleInput();
      await adapter.createShipment({
        ...input,
        consignee: { ...input.consignee, city: "Dubai", countryCode: "AE" },
      });

      const [, init] = lastCall();
      const body = JSON.parse(init.body as string);
      expect(body.delivery_city).toBe("Dubai");
    });
  });

  // ==========================================================================
  // FIX #7 — webhook auth is verified before payload-shape validation
  // ==========================================================================

  describe("webhook auth precedes payload validation (FIX #7)", () => {
    test("a wrong auth header on an invalid payload throws WebhookVerificationError, not ValidationError", () => {
      // Payload is missing required fields AND the auth header is wrong. Auth
      // must be checked first, so an unauthenticated caller never learns about
      // payload-shape validation.
      expect(() =>
        adapter.parseWebhook(
          { garbage: true },
          {
            headers: { "x-aymakan-auth": "wrong-secret" },
            config: {
              authHeader: "X-Aymakan-Auth",
              authValue: "correct-secret",
            },
          },
        ),
      ).toThrow(WebhookVerificationError);
    });

    test("a missing auth header on an invalid payload also throws WebhookVerificationError", () => {
      expect(() =>
        adapter.parseWebhook(
          { garbage: true },
          {
            headers: {},
            config: {
              authHeader: "X-Aymakan-Auth",
              authValue: "correct-secret",
            },
          },
        ),
      ).toThrow(WebhookVerificationError);
    });
  });
});
