// file: tests/smsaexpress/shipping.test.ts
/**
 * SMSA Express Shipping Tests
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
import {
  SMSAExpressAdapter,
  SMSAService,
} from "../../src/carriers/smsaexpress";
import {
  APIError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  WebhookVerificationError,
} from "../../src/core/errors";
import type { CreateShipmentInput, ShipmentStatus } from "../../src/core/types";

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


describe("SMSAExpressAdapter", () => {
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

  // =========================================================================
  // CONSTRUCTOR / CONFIG
  // =========================================================================

  describe("constructor", () => {
    test("uses sandbox URL by default", () => {
      const a = new SMSAExpressAdapter({
        mode: "sandbox",
        credentials: { apiKey: "key" },
      });
      expect(a.name).toBe("smsaexpress");
      expect(a.supportedCountries).toContain("SA");
    });

    test("sets production URL when mode is production", () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          headers: { "content-type": "application/json" },
        }),
      );

      const a = new SMSAExpressAdapter({
        mode: "production",
        credentials: { apiKey: "key" },
      });

      // Trigger a request to verify the URL
      a.getCities();

      const callUrl = (mockFetch.mock.calls[0] as unknown as [string])[0];
      expect(callUrl).toContain("ecomapis.smsaexpress.com");
    });
  });

  // =========================================================================
  // CREATE SHIPMENT (B2C)
  // =========================================================================

  describe("createShipment (B2C)", () => {
    const shipmentInput: CreateShipmentInput = {
      shipper: {
        name: "Test Shipper Company",
        phone: "96600000000",
        line1: "SMSA Express HQ, Dababh St",
        neighbourhood: "Sulimanyah",
        city: "Riyadh",
        postalCode: "63529",
        countryCode: "SA",
      },
      consignee: {
        name: "SMSA Express JED",
        phone: "966000000",
        line1: "سمسا حي الروضة test address",
        neighbourhood: "Ar Rawdah",
        city: "Jeddah",
        countryCode: "SA",
      },
      parcels: [
        {
          weight: { value: 3, unit: "kg" },
          pieces: 1,
          description: "Test contents",
        },
      ],
      serviceType: SMSAService.ECOMMERCE_DELIVERY,
      reference: "TEST-ORDER-001",
      cod: { enabled: true, amount: 100, currency: "SAR" },
      declaredValue: { amount: 100, currency: "SAR" },
    };

    test("creates B2C shipment with COD successfully", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [
              {
                awb: "290000000001",
                awbFile: "JVBERi0xLjQK...",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.createShipment(shipmentInput);

      expect(result.trackingNumber).toBe("290000000001");
      expect(result.carrier).toBe("smsaexpress");
      expect(result.status).toBe("created");
      expect(result.codAmount).toBe(100);
      expect(result.declaredValue).toBe(100);
      expect(result.currency).toBe("SAR");
      expect(result.reference).toBe("TEST-ORDER-001");
      // The inline waybill PDF from the create response is exposed as
      // pdfLabelUrl so callers can persist it without a getLabel round-trip.
      expect(result.pdfLabelUrl).toBe(
        "data:application/pdf;base64,JVBERi0xLjQK...",
      );
    });

    test("omits pdfLabelUrl when the waybill carries no awbFile", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000001" }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.createShipment(shipmentInput);

      expect(result.trackingNumber).toBe("290000000001");
      expect(result.pdfLabelUrl).toBeUndefined();
    });

    test("sends correct B2C request body", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000001", awbFile: "base64..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      await adapter.createShipment(shipmentInput);

      const [url, init] = mockFetch.mock.calls[1] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toContain("/api/shipment/b2c/new");

      const body = JSON.parse(init.body as string);
      expect(body.ConsigneeAddress.ContactName).toBe("SMSA Express JED");
      expect(body.ConsigneeAddress.City).toBe("Jeddah");
      expect(body.ConsigneeAddress.Country).toBe("SA");
      expect(body.ShipperAddress.ContactName).toBe("Test Shipper Company");
      expect(body.ShipperAddress.District).toBe("Sulimanyah");
      expect(body.CODAmount).toBe(100);
      expect(body.DeclaredValue).toBe(100);
      expect(body.Weight).toBe(3);
      expect(body.WeightUnit).toBe("KG");
      expect(body.WaybillType).toBe("PDF");
      expect(body.ServiceCode).toBe("EDDL");
      expect(body.OrderNumber).toBe("TEST-ORDER-001");
      expect(body.Parcels).toBe(1);
    });

    test("creates shipment without COD (CODAmount = 0)", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000002", awbFile: "base64..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const noCodInput: CreateShipmentInput = {
        ...shipmentInput,
        cod: undefined,
      };

      const result = await adapter.createShipment(noCodInput);

      expect(result.codAmount).toBeUndefined();

      const body = JSON.parse(
        (mockFetch.mock.calls[1] as unknown as [string, RequestInit])[1]
          .body as string,
      );
      expect(body.CODAmount).toBe(0);
    });

    test("converts lb weight to kg", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000003", awbFile: "base64..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const lbInput: CreateShipmentInput = {
        ...shipmentInput,
        parcels: [{ weight: { value: 10, unit: "lb" }, pieces: 2 }],
      };

      await adapter.createShipment(lbInput);

      const body = JSON.parse(
        (mockFetch.mock.calls[1] as unknown as [string, RequestInit])[1]
          .body as string,
      );
      // 10 lb ≈ 4.53592 kg
      expect(body.Weight).toBeCloseTo(4.53592, 3);
      expect(body.Parcels).toBe(2);
    });

    test("maps national address ShortCode", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000004", awbFile: "base64..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const shortCodeInput: CreateShipmentInput = {
        ...shipmentInput,
        consignee: {
          ...shipmentInput.consignee,
          nationalAddress: { shortCode: "RRRD2929" },
        },
      };

      await adapter.createShipment(shortCodeInput);

      const body = JSON.parse(
        (mockFetch.mock.calls[1] as unknown as [string, RequestInit])[1]
          .body as string,
      );
      expect(body.ConsigneeAddress.ShortCode).toBe("RRRD2929");
    });

    test("handles API error responses", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Invalid request data",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      );

      await expect(adapter.createShipment(shipmentInput)).rejects.toThrow(
        APIError,
      );
    });

    test("handles authentication errors", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      );

      await expect(adapter.createShipment(shipmentInput)).rejects.toThrow(
        AuthenticationError,
      );
    });

    test("sets ZPL waybill type when requested", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000005", awbFile: "base64zpl..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      await adapter.createShipment({
        ...shipmentInput,
        labelFormat: "ZPL",
      });

      const body = JSON.parse(
        (mockFetch.mock.calls[1] as unknown as [string, RequestInit])[1]
          .body as string,
      );
      expect(body.WaybillType).toBe("ZPL");
    });
  });

  // =========================================================================
  // CREATE SHIPMENT (C2B / Reverse Pickup)
  // =========================================================================

  describe("createShipment (C2B)", () => {
    const c2bInput: CreateShipmentInput = {
      shipper: {
        name: "Return Store Name Here",
        phone: "96600000000",
        line1: "SMSA Express HQ, Dababh St",
        neighbourhood: "Sulimanyah",
        city: "Riyadh",
        postalCode: "63529",
        countryCode: "SA",
      },
      consignee: {
        name: "SMSA Express JED Pickup",
        phone: "966000000",
        line1: "سمسا حي الروضة test pickup addr",
        neighbourhood: "Ar Rawdah",
        city: "Jeddah",
        countryCode: "SA",
      },
      parcels: [
        {
          weight: { value: 3, unit: "kg" },
          pieces: 1,
          description: "Return contents",
        },
      ],
      serviceType: "EDCR",
      reference: "RETURN-001",
      declaredValue: { amount: 50, currency: "SAR" },
    };

    test("routes C2B service code to /api/c2b/new", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000100000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000100001", awbFile: "base64..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.createShipment(c2bInput);

      const [url] = mockFetch.mock.calls[1] as unknown as [string];
      expect(url).toContain("/api/c2b/new");
      expect(result.trackingNumber).toBe("290000100001");
      expect(result.carrier).toBe("smsaexpress");
    });

    test("sends correct C2B request body", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000100000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000100002", awbFile: "base64..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      await adapter.createShipment(c2bInput);

      const body = JSON.parse(
        (mockFetch.mock.calls[1] as unknown as [string, RequestInit])[1]
          .body as string,
      );
      // C2B uses PickupAddress and ReturnToAddress (not ConsigneeAddress/ShipperAddress)
      expect(body.PickupAddress).toBeDefined();
      expect(body.ReturnToAddress).toBeDefined();
      expect(body.PickupAddress.ContactName).toBe("SMSA Express JED Pickup");
      expect(body.ReturnToAddress.ContactName).toBe("Return Store Name Here");
      expect(body.ServiceCode).toBe("EDCR");
      expect(body.DeclaredValue).toBe(50);
      // C2B has no CODAmount
      expect(body.CODAmount).toBeUndefined();
    });
  });

  // =========================================================================
  // TRACKING
  // =========================================================================

  describe("track", () => {
    test("tracks single shipment (delivered)", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "231200021000",
            Reference: "REF123",
            Pieces: 1,
            CODAmount: 0,
            ContentDesc: "Test package",
            RecipientName: "Abdulaziz",
            OriginCity: "Jeddah",
            OriginCountry: "SA",
            DesinationCity: "Riyadh",
            DesinationCountry: "SA",
            isDelivered: true,
            Scans: [
              {
                ReceivedBy: "Abdulaziz",
                City: "Riyadh",
                ScanType: "DL",
                ScanDescription: "Delivered",
                ScanDateTime: "2026-04-01T11:00:00",
                ScanTimeZone: "+03:00",
              },
              {
                City: "Riyadh",
                ScanType: "OD",
                ScanDescription: "Out for Delivery",
                ScanDateTime: "2026-04-01T10:00:00",
                ScanTimeZone: "+03:00",
              },
              {
                City: "Riyadh",
                ScanType: "HOP",
                ScanDescription: "Shipment Departed SMSA Sorting Facility",
                ScanDateTime: "2026-04-01T09:00:00",
                ScanTimeZone: "+03:00",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("231200021000");

      expect(result.trackingNumber).toBe("231200021000");
      expect(result.carrier).toBe("smsaexpress");
      expect(result.status).toBe("delivered");
      expect(result.statusLabel).toBe("Delivered");
      expect(result.reference).toBe("REF123");
      expect(result.pieces).toBe(1);
      expect(result.events).toHaveLength(3);

      // Events are mapped correctly
      expect(result.events[0]!.status).toBe("delivered");
      expect(result.events[0]!.location).toBe("Riyadh");
      expect(result.events[1]!.status).toBe("out_for_delivery");
      expect(result.events[2]!.status).toBe("in_transit");

      // Delivery date is extracted from DL scan (11:00 +03:00 = 08:00 UTC)
      expect(result.deliveryDate).toEqual(new Date("2026-04-01T08:00:00.000Z"));
    });

    test("tracks shipment in transit (not delivered)", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "231200022000",
            Reference: "",
            Pieces: 2,
            CODAmount: 150,
            ContentDesc: "Electronics",
            RecipientName: "Mohammed",
            OriginCity: "Jeddah",
            OriginCountry: "SA",
            DesinationCity: "Dammam",
            DesinationCountry: "SA",
            Scans: [
              {
                City: "Dammam",
                ScanType: "OD",
                ScanDescription: "Out for Delivery",
                ScanDateTime: "2026-04-02T10:00:00",
                ScanTimeZone: "+03:00",
              },
              {
                City: "Dammam",
                ScanType: "HOP",
                ScanDescription: "Shipment Departed SMSA Sorting Facility",
                ScanDateTime: "2026-04-02T09:00:00",
                ScanTimeZone: "+03:00",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("231200022000");

      expect(result.status).toBe("out_for_delivery");
      expect(result.statusLabel).toBe("Out for Delivery");
      expect(result.codAmount).toBe(150);
      expect(result.reference).toBeUndefined(); // empty string → undefined
      expect(result.deliveryDate).toBeUndefined();
    });

    test("handles tracking with no scans", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "231200023000",
            Reference: "",
            Pieces: 1,
            CODAmount: 0,
            ContentDesc: "",
            RecipientName: "",
            OriginCity: "",
            OriginCountry: "SA",
            DesinationCity: "",
            DesinationCountry: "SA",
            Scans: [],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("231200023000");

      expect(result.status).toBe("unknown");
      expect(result.statusLabel).toBe("Unknown");
      expect(result.events).toHaveLength(0);
    });

    test("handles tracking with omitted Scans key (no throw)", async () => {
      // A freshly-booked AWB can come back with no `Scans` key at all.
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "231200024000",
            Reference: "",
            Pieces: 1,
            CODAmount: 0,
            // intentionally no `Scans` field
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("231200024000");

      expect(result.status).toBe("unknown");
      expect(result.statusLabel).toBe("Unknown");
      expect(result.events).toHaveLength(0);
      expect(result.deliveryDate).toBeUndefined();
    });

    test("calls correct endpoint for single track", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "231200021000",
            Reference: "",
            Pieces: 1,
            CODAmount: 0,
            Scans: [],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      await adapter.track("231200021000");

      const [url] = mockFetch.mock.calls[0] as unknown as [string];
      expect(url).toContain("/api/track/single/231200021000");
    });
  });

  describe("trackMultiple", () => {
    test("tracks bulk shipments", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              AWB: "231200021000",
              Reference: "REF1",
              Pieces: 1,
              CODAmount: 0,
              ContentDesc: "Package 1",
              RecipientName: "Ali",
              OriginCity: "Riyadh",
              OriginCountry: "SA",
              DesinationCity: "Jeddah",
              DesinationCountry: "SA",
              isDelivered: true,
              Scans: [
                {
                  ReceivedBy: "Ali",
                  City: "Jeddah",
                  ScanType: "DL",
                  ScanDescription: "Delivered",
                  ScanDateTime: "2026-04-01T11:00:00",
                  ScanTimeZone: "+03:00",
                },
              ],
            },
            {
              AWB: "231200022222",
              Reference: "REF2",
              Pieces: 1,
              CODAmount: 100,
              ContentDesc: "Package 2",
              RecipientName: "Ahmed",
              OriginCity: "Riyadh",
              OriginCountry: "SA",
              DesinationCity: "Dammam",
              DesinationCountry: "SA",
              Scans: [
                {
                  City: "Dammam",
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
        "231200021000",
        "231200022222",
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]!.trackingNumber).toBe("231200021000");
      expect(results[0]!.status).toBe("delivered");
      expect(results[1]!.trackingNumber).toBe("231200022222");
      expect(results[1]!.status).toBe("out_for_delivery");
      expect(results[1]!.codAmount).toBe(100);
    });

    test("sends AWBs as JSON array in POST body", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          headers: { "content-type": "application/json" },
        }),
      );

      await adapter.trackMultiple(["AWB001", "AWB002"]);

      const [url, init] = mockFetch.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toContain("/api/track/bulk/");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual(["AWB001", "AWB002"]);
    });
  });

  describe("trackByReference", () => {
    test("tracks by reference", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "231200021000",
            Reference: "REF1234567895",
            Pieces: 1,
            CODAmount: 0,
            ContentDesc: "Package",
            RecipientName: "Ali",
            OriginCity: "Jeddah",
            OriginCountry: "SA",
            DesinationCity: "Riyadh",
            DesinationCountry: "SA",
            isDelivered: true,
            Scans: [
              {
                ReceivedBy: "Ali",
                City: "Riyadh",
                ScanType: "DL",
                ScanDescription: "Delivered",
                ScanDateTime: "2026-04-01T11:00:00",
                ScanTimeZone: "+03:00",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.trackByReference("REF1234567895");

      expect(result.trackingNumber).toBe("231200021000");
      expect(result.reference).toBe("REF1234567895");
      expect(result.status).toBe("delivered");

      const [url] = mockFetch.mock.calls[0] as unknown as [string];
      expect(url).toContain("/api/track/reference/REF1234567895");
    });

    test("handles API error for invalid reference", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      );

      await expect(adapter.trackByReference("INVALID")).rejects.toThrow(
        APIError,
      );
    });
  });

  // =========================================================================
  // CANCEL SHIPMENT
  // =========================================================================

  describe("cancelShipment", () => {
    test("cancels shipment successfully", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify("Shipment Cancelled Successfully!"), {
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await adapter.cancelShipment("290000000001");
      expect(result).toBe(true);

      const [url] = mockFetch.mock.calls[0] as unknown as [string];
      expect(url).toContain("/api/c2b/cancel/290000000001");
    });

    test("returns true for non-string success response", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await adapter.cancelShipment("290000000001");
      expect(result).toBe(true);
    });

    test("throws when the carrier does not confirm cancellation (e.g. B2C)", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify("Shipment not found or already processed"),
          {
            headers: { "content-type": "application/json" },
          },
        ),
      );

      await expect(adapter.cancelShipment("290000000001")).rejects.toThrow(
        APIError,
      );
    });
  });

  // =========================================================================
  // LABELS
  // =========================================================================

  describe("getLabel", () => {
    test("returns base64 data URI from B2C query", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [
              {
                awb: "290000000001",
                awbFile: "JVBERi0xLjQKbase64pdfcontent",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const label = await adapter.getLabel("290000000001");

      expect(label).toBe(
        "data:application/pdf;base64,JVBERi0xLjQKbase64pdfcontent",
      );

      const [url] = mockFetch.mock.calls[0] as unknown as [string];
      expect(url).toContain("/api/shipment/b2c/query/290000000001");
    });

    test("throws APIError when no waybill found in B2C or C2B", async () => {
      const emptyResponse = JSON.stringify({
        sawb: "290000000000",
        createDate: "2026-04-02T10:00:00",
        shipmentParcelsCount: 0,
        waybills: [],
      });
      // Mock both B2C and C2B query responses with no waybill
      mockFetch.mockResolvedValueOnce(
        new Response(emptyResponse, {
          headers: { "content-type": "application/json" },
        }),
      );
      mockFetch.mockResolvedValueOnce(
        new Response(emptyResponse, {
          headers: { "content-type": "application/json" },
        }),
      );

      await expect(adapter.getLabel("290000000000")).rejects.toThrow(APIError);
    });

    test("falls back to C2B query when B2C has no label", async () => {
      // B2C query returns empty waybills
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 0,
            waybills: [],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
      // C2B query returns the label
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000001", awbFile: "C2BLabelContent" }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const label = await adapter.getLabel("290000000001");
      expect(label).toBe("data:application/pdf;base64,C2BLabelContent");
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [url1] = mockFetch.mock.calls[0] as unknown as [string];
      const [url2] = mockFetch.mock.calls[1] as unknown as [string];
      expect(url1).toContain("/api/shipment/b2c/query/");
      expect(url2).toContain("/api/c2b/query/");
    });

    test("propagates authentication errors instead of swallowing", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      );

      await expect(adapter.getLabel("290000000001")).rejects.toThrow(
        AuthenticationError,
      );
      // Should NOT try C2B after an auth failure
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("falls back to C2B when B2C returns 404", async () => {
      // B2C returns 404
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      );
      // C2B returns the label
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000000000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000000001", awbFile: "C2BFromFallback" }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const label = await adapter.getLabel("290000000001");
      expect(label).toBe("data:application/pdf;base64,C2BFromFallback");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // CITIES & LOCATIONS
  // =========================================================================

  describe("getCities", () => {
    test("fetches and maps cities", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              cityName: "Riyadh",
              cityCode: "RUH",
              countryCode: "SA",
              currencyCode: "SAR",
              currencyName: "Saudi Riyal",
            },
            {
              cityName: "Jeddah",
              cityCode: "JED",
              countryCode: "SA",
              currencyCode: "SAR",
              currencyName: "Saudi Riyal",
            },
          ]),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const cities = await adapter.getCities();

      expect(cities).toHaveLength(2);
      expect(cities[0]!.nameEn).toBe("Riyadh");
      expect(cities[0]!.code).toBe("RUH");
      expect(cities[1]!.nameEn).toBe("Jeddah");
      expect(cities[1]!.code).toBe("JED");
    });

    test("passes country code in URL", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          headers: { "content-type": "application/json" },
        }),
      );

      await adapter.getCities("AE");

      const [url] = mockFetch.mock.calls[0] as unknown as [string];
      expect(url).toContain("/api/lookup/cities/AE");
    });
  });

  describe("getDropoffLocations", () => {
    test("fetches and maps SMSA offices", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              code: "1",
              address: "Al Sawidi Dist. Al Suwaidi Main St.",
              cityName: "Riyadh",
              addressAR: "حي السويدي - طريق السويدي العام",
              coordinates: "24.598472,46.687158",
              firstShift: "08:00 - 23:00",
              secondShift: "",
              weekendShift: "OFF",
            },
            {
              code: "12",
              address: "Alsharafiyah - King Abdullah Road",
              cityName: "Jeddah",
              addressAR: "الشرفية - طريق الملك عبدالله",
              coordinates: "21.5114,39.1883",
              firstShift: "08:00 - 23:00",
              secondShift: "",
              weekendShift: "OFF",
            },
          ]),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const locations = await adapter.getDropoffLocations();

      expect(locations).toHaveLength(2);
      expect(locations[0]!.id).toBe("1");
      expect(locations[0]!.city).toBe("Riyadh");
      expect(locations[0]!.latitude).toBeCloseTo(24.598472, 4);
      expect(locations[0]!.longitude).toBeCloseTo(46.687158, 4);
      expect(locations[0]!.nameAr).toBe("حي السويدي - طريق السويدي العام");
      expect(locations[1]!.id).toBe("12");
      expect(locations[1]!.city).toBe("Jeddah");
    });

    test("handles offices with missing coordinates", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              code: "427",
              address: "SMSA Egypt - Mansoura",
              cityName: "Mansoura",
              addressAR: "",
              coordinates: "",
              firstShift: "",
              secondShift: "",
              weekendShift: "OFF",
            },
          ]),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const locations = await adapter.getDropoffLocations();

      expect(locations).toHaveLength(1);
      expect(locations[0]!.latitude).toBeUndefined();
      expect(locations[0]!.longitude).toBeUndefined();
    });
  });

  // =========================================================================
  // STATUS MAPPING
  // =========================================================================

  describe("status mapping", () => {
    test("maps all known scan types correctly", async () => {
      const testCases: [string, ShipmentStatus][] = [
        ["DL", "delivered"],
        ["OD", "out_for_delivery"],
        ["AF", "at_warehouse"],
        ["HOP", "in_transit"],
        ["PU", "picked_up"],
        ["DE", "exception"],
        ["CAN", "cancelled"],
        ["RTO", "returned"],
        ["BK", "created"],
      ];

      for (const [scanType, expectedStatus] of testCases) {
        mockFetch.mockReset();
        mockFetch.mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              AWB: "TEST",
              Reference: "",
              Pieces: 1,
              CODAmount: 0,
              Scans: [
                {
                  City: "Riyadh",
                  ScanType: scanType,
                  ScanDescription: "Test",
                  ScanDateTime: "2026-04-01T10:00:00",
                  ScanTimeZone: "+03:00",
                },
              ],
            }),
            { headers: { "content-type": "application/json" } },
          ),
        );

        const result = await adapter.track("TEST");
        expect(result.status).toBe(expectedStatus);
      }
    });

    test("defaults unknown scan types to unknown", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "TEST",
            Reference: "",
            Pieces: 1,
            CODAmount: 0,
            Scans: [
              {
                City: "Riyadh",
                ScanType: "UNKNOWN_CODE",
                ScanDescription: "Unknown event",
                ScanDateTime: "2026-04-01T10:00:00",
                ScanTimeZone: "+03:00",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("TEST");
      expect(result.status).toBe("unknown");
    });

    test("isDelivered flag overrides scan-based status", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "TEST",
            Reference: "",
            Pieces: 1,
            CODAmount: 0,
            isDelivered: true,
            Scans: [
              {
                City: "Riyadh",
                ScanType: "HOP",
                ScanDescription: "In transit",
                ScanDateTime: "2026-04-01T10:00:00",
                ScanTimeZone: "+03:00",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("TEST");
      expect(result.status).toBe("delivered");
    });
  });

  // =========================================================================
  // API KEY HEADER
  // =========================================================================

  describe("authentication", () => {
    test("sends apikey header on all requests", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          headers: { "content-type": "application/json" },
        }),
      );

      await adapter.getCities();

      const [, init] = mockFetch.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      const headers = init.headers as Record<string, string>;
      expect(headers.apikey).toBe("test-api-key");
    });
  });

  // =========================================================================
  // 2-WAY SHIPMENT
  // =========================================================================

  describe("create2WayShipment", () => {
    const twoWayInput: CreateShipmentInput = {
      shipper: {
        name: "Test Shipper Company",
        phone: "96600000000",
        line1: "SMSA Express HQ, Dababh St",
        neighbourhood: "Sulimanyah",
        city: "Riyadh",
        postalCode: "63529",
        countryCode: "SA",
      },
      consignee: {
        name: "SMSA Express JED",
        phone: "966000000",
        line1: "سمسا حي الروضة test address",
        neighbourhood: "Ar Rawdah",
        city: "Jeddah",
        countryCode: "SA",
      },
      parcels: [
        {
          weight: { value: 2, unit: "kg" },
          pieces: 1,
          description: "2-way contents",
        },
      ],
      serviceType: "EDDL",
      reference: "2WAY-001",
      declaredValue: { amount: 100, currency: "SAR" },
    };

    test("creates 2-way shipment via correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000200000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [
              {
                awb: "290000200001",
                awbFile: "base64...",
                returnBarcode: "returnBase64...",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.create2WayShipment(twoWayInput);

      const [url] = mockFetch.mock.calls[1] as unknown as [string];
      expect(url).toContain("/api/TwoWayShipment/new");
      expect(result.trackingNumber).toBe("290000200001");
      expect(result.carrier).toBe("smsaexpress");
      expect(result.status).toBe("created");
      expect(result.returnLabel).toBe(
        "data:application/pdf;base64,returnBase64...",
      );
    });

    test("sends correct 2-way request body", async () => {
      mockFetch.mockResolvedValueOnce(smsaCitiesLookup());
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sawb: "290000200000",
            createDate: "2026-04-02T10:00:00",
            shipmentParcelsCount: 1,
            waybills: [{ awb: "290000200002", awbFile: "base64..." }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      await adapter.create2WayShipment(twoWayInput);

      const body = JSON.parse(
        (mockFetch.mock.calls[1] as unknown as [string, RequestInit])[1]
          .body as string,
      );
      expect(body.ConsigneeAddress.ContactName).toBe("SMSA Express JED");
      expect(body.ShipperAddress.ContactName).toBe("Test Shipper Company");
      expect(body.DeclaredValue).toBe(100);
      expect(body.Weight).toBe(2);
      expect(body.WeightUnit).toBe("KG");
      expect(body.WaybillType).toBe("PDF");
      expect(body.OrderNumber).toBe("2WAY-001");
    });
  });

  // =========================================================================
  // SMSA-SPECIFIC OPERATIONS
  // =========================================================================

  describe("sendInvoice", () => {
    test("sends invoice to correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify("Invoice logged successfully"), {
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await adapter.sendInvoice({
        AWB: "231215638548",
        Currency: "SAR",
        WeightUnit: "KG",
        InvoiceDate: "02/02/2022",
        Items: [
          {
            sequence: 1,
            ItemHSCode: "123456",
            QuantityUnit: "UNIT",
            ItemReference: "REF02",
            ItemDescription: "ITEM 02 Description",
            Weight: 2.0,
            ItemValue: 200.0,
            Quantity: 10,
            CountryOfOrigin: "SA",
          },
        ],
      });

      const [url, init] = mockFetch.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toContain("/api/invoice");
      expect(init.method).toBe("POST");
      expect(result).toBe("Invoice logged successfully");
    });
  });

  describe("validateShortAddress", () => {
    test("resolves short code to full address", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            address1: "2239 Al Urubah Rd - Al Olaya Dist.",
            address2: "RIYADH 12214 - 9597",
            buildingNumber: "2239",
            street: "Al Urubah Rd",
            district: "Al Olaya Dist.",
            city: "RIYADH",
            postCode: "12214",
            additionalNumber: "9597",
            regionName: "Riyadh",
            latitude: "24.71142483",
            longitude: "46.67439068",
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.validateShortAddress("RRRD2929");

      const [url] = mockFetch.mock.calls[0] as unknown as [string];
      expect(url).toContain("/api/Lookup/FullAddressByShortCode/RRRD2929");
      expect(result.city).toBe("RIYADH");
      expect(result.postCode).toBe("12214");
      expect(result.district).toBe("Al Olaya Dist.");
    });
  });

  describe("pushIdDetails", () => {
    test("submits identity details", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            awb: "123456789012",
            message: "Identity details saved successfully",
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.pushIdDetails({
        awb: "123456789012",
        birthDate: "1990-05-20",
        documentType: "PASSPORT",
        idName: "John Doe",
        idNumber: "AB123456",
        issueDate: "2020-01-15",
        nationality: "US",
        shipmentReference: "REF-001",
      });

      const [url, init] = mockFetch.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toContain("/api/shipment/identity-details");
      expect(init.method).toBe("POST");
      expect(result.id).toBe(1);
      expect(result.awb).toBe("123456789012");
      expect(result.message).toContain("saved successfully");
    });
  });

  // =========================================================================
  // TIMESTAMP TIMEZONE HANDLING
  // =========================================================================

  describe("tracking timezone handling", () => {
    test("tracking events include timezone offset in timestamps", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "TZ-TEST",
            Reference: "",
            Pieces: 1,
            CODAmount: 0,
            Scans: [
              {
                City: "Riyadh",
                ScanType: "OD",
                ScanDescription: "Out for Delivery",
                ScanDateTime: "2026-04-01T11:00:00",
                ScanTimeZone: "+03:00",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("TZ-TEST");
      const event = result.events[0]!;

      // The timestamp should be parsed with +03:00 offset
      // 11:00 +03:00 = 08:00 UTC
      expect(event.timestamp.toISOString()).toBe("2026-04-01T08:00:00.000Z");
    });

    test("delivery date includes timezone offset", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AWB: "TZ-DL",
            Reference: "",
            Pieces: 1,
            CODAmount: 0,
            isDelivered: true,
            Scans: [
              {
                ReceivedBy: "Ali",
                City: "Riyadh",
                ScanType: "DL",
                ScanDescription: "Delivered",
                ScanDateTime: "2026-04-01T14:30:00",
                ScanTimeZone: "+03:00",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

      const result = await adapter.track("TZ-DL");

      // 14:30 +03:00 = 11:30 UTC
      expect(result.deliveryDate?.toISOString()).toBe(
        "2026-04-01T11:30:00.000Z",
      );
    });
  });

  // =========================================================================
  // GETLABEL 5XX HANDLING
  // =========================================================================

  describe("getLabel server error handling", () => {
    test("propagates 500 errors instead of falling back to C2B", async () => {
      const error500 = () =>
        new Response(JSON.stringify({ message: "Internal Server Error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      // Provide responses for all retry attempts (initial + 2 retries)
      mockFetch.mockResolvedValueOnce(error500());
      mockFetch.mockResolvedValueOnce(error500());
      mockFetch.mockResolvedValueOnce(error500());

      await expect(adapter.getLabel("290000000001")).rejects.toThrow(APIError);
      // Should NOT try C2B after a server error (3 = initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("error handling", () => {
    test("wraps abort as NetworkError", async () => {
      // Provide for all retry attempts (network errors are retryable)
      mockFetch.mockRejectedValueOnce(
        new DOMException("The operation was aborted", "AbortError"),
      );
      mockFetch.mockRejectedValueOnce(
        new DOMException("The operation was aborted", "AbortError"),
      );
      mockFetch.mockRejectedValueOnce(
        new DOMException("The operation was aborted", "AbortError"),
      );

      await expect(adapter.track("TEST")).rejects.toThrow(NetworkError);
    });

    test("wraps fetch failure as NetworkError", async () => {
      // Provide for all retry attempts (network errors are retryable)
      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

      await expect(adapter.track("TEST")).rejects.toThrow(NetworkError);
    });
  });

  // =========================================================================
  // WEBHOOKS
  // =========================================================================

  describe("parseWebhook", () => {
    const deliveredPayload = [
      {
        AWB: "231200021000",
        Reference: "REF1234567890",
        Pieces: 1,
        CODAmount: 0.0,
        ContentDesc: "Shipment contents description",
        RecipientName: "Abdulaziz",
        OriginCity: "Jeddah",
        OriginCountry: "SA",
        DesinationCity: "Riyadh",
        DesinationCountry: "SA",
        isDelivered: true,
        Scans: [
          {
            ReferenceID: 10611,
            ReceivedBy: "Abdulaziz",
            City: "Riyadh",
            ScanType: "DL",
            ScanDescription: "Delivered",
            ScanDateTime: "2024-01-10T11:00:00",
            ScanTimeZone: "+03:00",
          },
          {
            ReferenceID: 10541,
            City: "Riyadh",
            ScanType: "OD",
            ScanDescription: "Out for Delivery",
            ScanDateTime: "2024-01-10T10:00:00",
            ScanTimeZone: "+03:00",
          },
          {
            ReferenceID: 10354,
            City: "Jeddah",
            ScanType: "AF",
            ScanDescription: "Arrived Delivery Facility",
            ScanDateTime: "2024-01-10T09:00:00",
            ScanTimeZone: "+03:00",
          },
        ],
      },
    ];

    const batchPayload = [
      ...deliveredPayload,
      {
        AWB: "231200022000",
        Reference: "REF1234567890",
        Pieces: 1,
        CODAmount: 0.0,
        ContentDesc: "Shipment contents description",
        RecipientName: "Abdulaziz",
        OriginCity: "Jeddah",
        OriginCountry: "SA",
        DesinationCity: "Riyadh",
        DesinationCountry: "SA",
        Scans: [
          {
            ReferenceID: 10545,
            City: "Riyadh",
            ScanType: "OD",
            ScanDescription: "Out for Delivery",
            ScanDateTime: "2024-01-10T10:00:00",
            ScanTimeZone: "+03:00",
          },
          {
            ReferenceID: 10360,
            City: "Jeddah",
            ScanType: "AF",
            ScanDescription: "Arrived Delivery Facility",
            ScanDateTime: "2024-01-10T09:00:00",
            ScanTimeZone: "+03:00",
          },
        ],
      },
    ];

    test("parses single webhook item correctly (delivered)", () => {
      const event = adapter.parseWebhook(deliveredPayload);

      expect(event.carrier).toBe("smsaexpress");
      expect(event.eventType).toBe("status_update");
      expect(event.trackingNumber).toBe("231200021000");
      expect(event.reference).toBe("REF1234567890");
      expect(event.status).toBe("delivered");
      expect(event.statusCode).toBe("DL");
      expect(event.statusLabel).toBe("Delivered");
      // 11:00 +03:00 = 08:00 UTC
      expect(event.timestamp.toISOString()).toBe("2024-01-10T08:00:00.000Z");
      expect(event.raw).toEqual(deliveredPayload[0]);
    });

    test("parses batch webhook payload (multiple shipments, one event per scan)", () => {
      const events = adapter.parseWebhookBatch(batchPayload);

      // Shipment 1 has 3 scans (AF, OD, DL), shipment 2 has 2 scans (AF, OD) —
      // every scan becomes its own event so no transition history is dropped.
      expect(events).toHaveLength(5);

      // Shipment 1's events come first, in chronological (oldest → newest) order.
      expect(events[0]!.trackingNumber).toBe("231200021000");
      expect(events[0]!.statusCode).toBe("AF");
      expect(events[0]!.status).toBe("at_warehouse");

      expect(events[1]!.trackingNumber).toBe("231200021000");
      expect(events[1]!.statusCode).toBe("OD");
      expect(events[1]!.status).toBe("out_for_delivery");

      expect(events[2]!.trackingNumber).toBe("231200021000");
      expect(events[2]!.statusCode).toBe("DL");
      expect(events[2]!.status).toBe("delivered");

      // Shipment 2's events follow, also chronological.
      expect(events[3]!.trackingNumber).toBe("231200022000");
      expect(events[3]!.statusCode).toBe("AF");
      expect(events[3]!.status).toBe("at_warehouse");

      expect(events[4]!.trackingNumber).toBe("231200022000");
      expect(events[4]!.status).toBe("out_for_delivery");
      expect(events[4]!.statusCode).toBe("OD");
      expect(events[4]!.statusLabel).toBe("Out for Delivery");
    });

    test("rejects non-array payload", () => {
      expect(() => adapter.parseWebhook({ AWB: "123", Scans: [] })).toThrow(
        ValidationError,
      );
    });

    test("rejects empty array payload", () => {
      expect(() => adapter.parseWebhook([])).toThrow(ValidationError);
    });

    test("rejects payload with missing required fields", () => {
      expect(() =>
        adapter.parseWebhook([{ Reference: "REF", Pieces: 1 }]),
      ).toThrow(ValidationError);
    });

    test("verifies auth via query param", () => {
      const event = adapter.parseWebhook(deliveredPayload, {
        queryParams: { key: "my-secret-key" },
        config: {
          authQueryParam: "key",
          authQueryValue: "my-secret-key",
        },
      });

      expect(event.trackingNumber).toBe("231200021000");
    });

    test("throws WebhookVerificationError on auth query param mismatch", () => {
      expect(() =>
        adapter.parseWebhook(deliveredPayload, {
          queryParams: { key: "wrong-key" },
          config: {
            authQueryParam: "key",
            authQueryValue: "my-secret-key",
          },
        }),
      ).toThrow(WebhookVerificationError);
    });

    test("verifies auth via header", () => {
      const event = adapter.parseWebhook(deliveredPayload, {
        headers: { "X-SMSA-Auth": "secret-123" },
        config: {
          authHeader: "X-SMSA-Auth",
          authValue: "secret-123",
        },
      });

      expect(event.trackingNumber).toBe("231200021000");
    });

    test("throws WebhookVerificationError on auth header mismatch", () => {
      expect(() =>
        adapter.parseWebhook(deliveredPayload, {
          headers: { "X-SMSA-Auth": "wrong" },
          config: {
            authHeader: "X-SMSA-Auth",
            authValue: "secret-123",
          },
        }),
      ).toThrow(WebhookVerificationError);
    });

    test("handles shipment with no scans (unknown status)", () => {
      const noScansPayload = [
        {
          AWB: "231200099000",
          Reference: "",
          Pieces: 1,
          CODAmount: 0,
          ContentDesc: "",
          RecipientName: "",
          OriginCity: "",
          OriginCountry: "SA",
          DesinationCity: "",
          DesinationCountry: "SA",
          Scans: [],
        },
      ];

      const event = adapter.parseWebhook(noScansPayload);

      expect(event.trackingNumber).toBe("231200099000");
      expect(event.status).toBe("unknown");
      expect(event.statusCode).toBe("unknown");
      expect(event.reference).toBeUndefined();
    });
  });
});
