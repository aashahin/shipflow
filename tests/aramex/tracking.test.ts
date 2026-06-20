// file: tests/aramex/tracking.test.ts
/**
 * Aramex Tracking Tests
 * Verifies the TrackShipments mapping, including both JSON shapes the WCF
 * gateway may return for the TrackingResults dictionary.
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

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const events = () => [
  {
    WaybillNumber: "47384200001",
    UpdateCode: "SH005",
    UpdateDescription: "Out for delivery",
    UpdateDateTime: "/Date(1718800000000+0300)/",
    UpdateLocation: "Riyadh",
    GrossWeight: "1.5",
  },
  {
    WaybillNumber: "47384200001",
    UpdateCode: "SH014",
    UpdateDescription: "Shipment delivered",
    UpdateDateTime: "/Date(1718900000000+0300)/",
    UpdateLocation: "Riyadh",
  },
];

describe("AramexAdapter — tracking", () => {
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

  test("maps the KeyValue-array TrackingResults shape", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        TrackingResults: [{ Key: "47384200001", Value: events() }],
        NonExistingWaybills: [],
      }),
    );

    const result = await adapter.track("47384200001");

    expect(result.trackingNumber).toBe("47384200001");
    expect(result.carrier).toBe("aramex");
    expect(result.status).toBe("delivered");
    expect(result.events).toHaveLength(2);
    // Sorted newest-first → delivered event leads.
    expect(result.events[0]!.status).toBe("delivered");
    expect(result.events[1]!.status).toBe("out_for_delivery");
    expect(result.deliveryDate).toBeInstanceOf(Date);
    expect(result.weight).toBe(1.5);

    const [url] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/Tracking/Service_1_0.svc/json/TrackShipments");
  });

  test("maps the plain object-map TrackingResults shape", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        TrackingResults: { "47384200001": events() },
        NonExistingWaybills: [],
      }),
    );

    const results = await adapter.trackMultiple(["47384200001"]);

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("delivered");
  });

  test("falls back to description heuristic for unmapped UpdateCode", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        TrackingResults: [
          {
            Key: "47384200002",
            Value: [
              {
                WaybillNumber: "47384200002",
                UpdateCode: "ZZ999", // not in our table
                UpdateDescription: "Shipment has been delivered to consignee",
                UpdateDateTime: "/Date(1718900000000+0300)/",
                UpdateLocation: "Jeddah",
              },
            ],
          },
        ],
        NonExistingWaybills: [],
      }),
    );

    const result = await adapter.track("47384200002");
    expect(result.status).toBe("delivered");
  });

  test("description heuristic maps a failed delivery to exception, not delivered", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        TrackingResults: [
          {
            Key: "47384200003",
            Value: [
              {
                WaybillNumber: "47384200003",
                UpdateCode: "ZZ998", // unmapped → falls back to description
                UpdateDescription: "Delivery attempt failed - consignee not available",
                UpdateDateTime: "/Date(1718900000000+0300)/",
                UpdateLocation: "Jeddah",
              },
            ],
          },
        ],
        NonExistingWaybills: [],
      }),
    );

    const result = await adapter.track("47384200003");
    expect(result.status).toBe("exception");
  });

  test("surfaces NonExistingWaybills as 'unknown' results so inputs stay aligned", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        // Only the first waybill was found; the second is not-found.
        TrackingResults: [{ Key: "47384200001", Value: events() }],
        NonExistingWaybills: ["99999999999"],
      }),
    );

    const results = await adapter.trackMultiple([
      "47384200001",
      "99999999999",
    ]);

    expect(results).toHaveLength(2);
    const byNumber = Object.fromEntries(
      results.map((r) => [r.trackingNumber, r]),
    );
    expect(byNumber["47384200001"]!.status).toBe("delivered");
    const missing = byNumber["99999999999"]!;
    expect(missing.status).toBe("unknown");
    expect(missing.events).toHaveLength(0);
    expect(missing.statusLabel).toBe("Waybill not found");
  });

  test("track() throws a precise not-found for a NonExistingWaybill", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        TrackingResults: [],
        NonExistingWaybills: ["99999999999"],
      }),
    );

    const error = await adapter
      .track("99999999999")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).message).toContain("not found");
  });

  test("track() throws not-found when the waybill is in neither bucket", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        TrackingResults: [],
        NonExistingWaybills: [],
      }),
    );

    await expect(adapter.track("00000000000")).rejects.toThrow(APIError);
  });

  test("trackByReference echoes the reference back", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        TrackingResults: [{ Key: "REF-1", Value: events() }],
        NonExistingWaybills: [],
      }),
    );

    const result = await adapter.trackByReference("REF-1");
    expect(result.reference).toBe("REF-1");
    expect(result.status).toBe("delivered");
  });
});
