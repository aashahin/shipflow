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
import { ValidationError } from "../../src/core/errors";
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
});
