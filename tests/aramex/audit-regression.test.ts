// file: tests/aramex/audit-regression.test.ts
/**
 * Aramex Audit Regression Tests
 * Locks in the load-bearing contract decisions: per-service base-URL routing,
 * mode → host selection, ClientInfo-in-body auth, pickup create/cancel, and the
 * unsupported cancelShipment. Uses mocked fetch — no network calls.
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
import { resolveProductGroupAndType } from "../../src/carriers/aramex/mappers";
import { APIError, UnsupportedOperationError } from "../../src/core/errors";
import type { CreateShipmentInput, PickupRequest } from "../../src/core/types";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
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
});

const samplePickup = (): PickupRequest => ({
  date: "2026-07-01",
  timeSlot: "09:00-17:00",
  city: "Riyadh",
  contactName: "Store Manager",
  contactPhone: "966500000000",
  address: "King Fahd Road",
  shipmentCount: 2,
});

const createOk = () =>
  json({
    HasErrors: false,
    Notifications: [],
    Shipments: [{ ID: "AWB1", HasErrors: false, Notifications: [] }],
  });

function lastCall(): [string, RequestInit] {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1] as unknown as [string, RequestInit];
}

const credentials = {
  userName: "test@user.com",
  password: "secret",
  accountNumber: "12345",
  accountPin: "9999",
  accountEntity: "RUH",
  accountCountryCode: "SA",
};

describe("Aramex audit regression", () => {
  let adapter: AramexAdapter;

  beforeAll(() => {
    globalThis.fetch = mockFetch as any;
  });
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });
  beforeEach(() => {
    mockFetch.mockReset();
    adapter = new AramexAdapter({ mode: "sandbox", credentials });
  });

  describe("per-service base-URL routing", () => {
    test("CreateShipments hits the Shipping service on the sandbox host", async () => {
      mockFetch.mockResolvedValueOnce(createOk());
      await adapter.createShipment(sampleInput());
      const [url] = lastCall();
      expect(url).toContain("ws.dev.aramex.net");
      expect(url).toContain("/Shipping/Service_1_0.svc/json/CreateShipments");
    });

    test("TrackShipments hits the Tracking service", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          TrackingResults: [],
          NonExistingWaybills: [],
        }),
      );
      await adapter.trackMultiple(["AWB1"]);
      const [url] = lastCall();
      expect(url).toContain("/Tracking/Service_1_0.svc/json/TrackShipments");
    });

    test("CalculateRate hits the RateCalculator service", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          TotalAmount: { Value: 10, CurrencyCode: "SAR" },
        }),
      );
      await adapter.getRates(sampleInput());
      const [url] = lastCall();
      expect(url).toContain(
        "/RateCalculator/Service_1_0.svc/json/CalculateRate",
      );
    });

    test("FetchCities hits the Location service", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [], Cities: [] }),
      );
      await adapter.getCities();
      const [url] = lastCall();
      expect(url).toContain("/Location/Service_1_0.svc/json/FetchCities");
    });
  });

  describe("mode → host selection", () => {
    test("production mode targets ws.aramex.net", async () => {
      const prod = new AramexAdapter({ mode: "production", credentials });
      mockFetch.mockResolvedValueOnce(createOk());
      await prod.createShipment(sampleInput());
      const [url] = lastCall();
      expect(url).toContain("https://ws.aramex.net/");
      expect(url).not.toContain("ws.dev.aramex.net");
    });

    test("locationBaseUrl override is honored", async () => {
      const custom = new AramexAdapter({
        mode: "production",
        credentials,
        locationBaseUrl: "https://anfe02.aramex.com/ShippingAPI.V2/Location/Service_1_0.svc",
      });
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [], Cities: [] }),
      );
      await custom.getCities();
      const [url] = lastCall();
      expect(url).toContain("anfe02.aramex.com");
    });
  });

  describe("auth", () => {
    test("every request carries ClientInfo in the body and no auth header", async () => {
      mockFetch.mockResolvedValueOnce(createOk());
      await adapter.createShipment(sampleInput());
      const [, init] = lastCall();
      expect(JSON.parse(init.body as string).ClientInfo.AccountNumber).toBe(
        "12345",
      );
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    test("source and version are configurable", async () => {
      const custom = new AramexAdapter({
        mode: "sandbox",
        credentials,
        source: 3,
        version: "1.0",
      });
      mockFetch.mockResolvedValueOnce(createOk());
      await custom.createShipment(sampleInput());
      const ci = JSON.parse(lastCall()[1].body as string).ClientInfo;
      expect(ci.Source).toBe(3);
      expect(ci.Version).toBe("1.0");
    });
  });

  // These lock in the WCF "required data member" fixes found via live testing:
  // an empty Transaction `{}`, or an Address/Contact missing members, fails
  // Aramex's deserializer ("required data members '...' were not found").
  describe("WCF required-member request shape", () => {
    test("Transaction always carries Reference1–Reference5 (empty by default)", async () => {
      mockFetch.mockResolvedValueOnce(createOk());
      await adapter.createShipment(sampleInput());
      const body = JSON.parse(lastCall()[1].body as string);
      expect(body.Transaction).toEqual({
        Reference1: "",
        Reference2: "",
        Reference3: "",
        Reference4: "",
        Reference5: "",
      });
    });

    test("PartyAddress always includes Line2/Line3/PostCode even when unset", async () => {
      mockFetch.mockResolvedValueOnce(createOk());
      // sampleInput's shipper has no line2/neighbourhood/postalCode.
      await adapter.createShipment(sampleInput());
      const addr = JSON.parse(lastCall()[1].body as string).Shipments[0].Shipper
        .PartyAddress;
      expect(addr.Line2).toBe("");
      expect(addr.Line3).toBe("");
      expect(addr.PostCode).toBe("");
    });

    test("Contact always includes the required string members", async () => {
      mockFetch.mockResolvedValueOnce(createOk());
      await adapter.createShipment(sampleInput());
      const contact = JSON.parse(lastCall()[1].body as string).Shipments[0]
        .Shipper.Contact;
      for (const key of [
        "Department",
        "PersonName",
        "Title",
        "CompanyName",
        "PhoneNumber1",
        "PhoneNumber1Ext",
        "PhoneNumber2",
        "CellPhone",
        "EmailAddress",
        "Type",
      ]) {
        expect(contact[key]).toBeDefined();
      }
      expect(contact.EmailAddress).toBe(""); // sampleInput has no email
    });

    test("CalculateRate sends the populated Transaction and addresses", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          TotalAmount: { Value: 10, CurrencyCode: "SAR" },
        }),
      );
      await adapter.getRates(sampleInput());
      const body = JSON.parse(lastCall()[1].body as string);
      expect(body.Transaction.Reference1).toBe("");
      expect(body.OriginAddress.PostCode).toBe("");
      expect(body.DestinationAddress.Line2).toBe("");
    });
  });

  describe("pickups", () => {
    test("createPickup posts to CreatePickup and returns the GUID as id", async () => {
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          ProcessedPickup: { ID: "1", GUID: "abc-guid-123" },
        }),
      );

      const pickup = await adapter.createPickup(samplePickup());

      const [url, init] = lastCall();
      expect(url).toContain("/Shipping/Service_1_0.svc/json/CreatePickup");
      expect(JSON.parse(init.body as string).Pickup.PickupContact.PersonName).toBe(
        "Store Manager",
      );
      expect(pickup.id).toBe("abc-guid-123");
      expect(pickup.carrier).toBe("aramex");
    });

    test("PickupAddress carries the required WCF members (Line2/Line3/PostCode)", async () => {
      // The WCF `Address` contract marks Line2/Line3/PostCode as required; a
      // CreatePickup that omits them fails deserialization. They must be present
      // (empty when unset), exactly like the Shipper/Consignee addresses.
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          ProcessedPickup: { ID: "1", GUID: "abc-guid-123" },
        }),
      );
      await adapter.createPickup(samplePickup());
      const addr = JSON.parse(lastCall()[1].body as string).Pickup.PickupAddress;
      expect(addr.Line1).toBe("King Fahd Road");
      expect(addr.Line2).toBe("");
      expect(addr.Line3).toBe("");
      expect(addr.PostCode).toBe("");
      expect(addr.City).toBe("Riyadh");
      expect(addr.CountryCode).toBe("SA");
    });

    test("createPickup id round-trips to cancelPickup as the GUID even when an ID is also present", async () => {
      // ProcessedPickup carries BOTH a numeric ID and a GUID. CancelPickup keys
      // on the GUID, so the surfaced id must be the GUID, not the ID.
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          ProcessedPickup: { ID: "42", GUID: "guid-xyz-789" },
        }),
      );
      const pickup = await adapter.createPickup(samplePickup());
      expect(pickup.id).toBe("guid-xyz-789");

      // Feed the surfaced id straight back into cancelPickup.
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [] }),
      );
      const ok = await adapter.cancelPickup(pickup.id);
      expect(ok).toBe(true);
      expect(JSON.parse(lastCall()[1].body as string).PickupGUID).toBe(
        "guid-xyz-789",
      );
    });

    test("createPickup surfaces per-shipment ProcessedShipments errors even with a GUID", async () => {
      // Header-level success (a GUID is present) but a contained shipment failed
      // — must not be reported as a clean success.
      mockFetch.mockResolvedValueOnce(
        json({
          HasErrors: false,
          Notifications: [],
          ProcessedPickup: {
            ID: "42",
            GUID: "guid-xyz-789",
            ProcessedShipments: [
              { ID: "AWB-1", HasErrors: false, Notifications: [] },
              {
                ID: "",
                HasErrors: true,
                Notifications: [
                  { Code: "ERR9", Message: "Invalid pickup shipment weight" },
                ],
              },
            ],
          },
        }),
      );

      const error = await adapter
        .createPickup(samplePickup())
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(APIError);
      expect((error as APIError).message).toContain(
        "Invalid pickup shipment weight",
      );
    });

    test("createPickup throws on a fake-200 body with no usable pickup id", async () => {
      // HasErrors:false but an empty ProcessedPickup — success must be judged
      // from the body payload (GUID/ID), not the HTTP 200 status.
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [], ProcessedPickup: {} }),
      );

      await expect(adapter.createPickup(samplePickup())).rejects.toThrow(
        APIError,
      );
    });

    test("cancelPickup posts the GUID and reports success from HasErrors:false", async () => {
      mockFetch.mockResolvedValueOnce(
        json({ HasErrors: false, Notifications: [] }),
      );

      const ok = await adapter.cancelPickup("abc-guid-123");

      const [url, init] = lastCall();
      expect(url).toContain("/Shipping/Service_1_0.svc/json/CancelPickup");
      expect(JSON.parse(init.body as string).PickupGUID).toBe("abc-guid-123");
      expect(ok).toBe(true);
    });
  });

  describe("unsupported operations", () => {
    test("cancelShipment throws UnsupportedOperationError", () => {
      expect(() => adapter.cancelShipment("AWB1")).toThrow(
        UnsupportedOperationError,
      );
    });
  });

  // An explicit valid product type must dictate the group so the DOM/EXP + type
  // pair is always valid — OND is the ONLY domestic type, everything else is
  // express. Guards against the old bug where the group came from the
  // same-country heuristic while the type was validated independently, yielding
  // invalid combos like DOM+PPX or EXP+OND.
  describe("productGroup/type pair stays consistent (fix #5)", () => {
    // A cross-country variant of sampleInput (shipper SA, consignee AE).
    const crossCountryInput = (): CreateShipmentInput => {
      const input = sampleInput();
      input.consignee.countryCode = "AE";
      return input;
    };

    test.each<[string, () => CreateShipmentInput, "DOM" | "EXP", string]>([
      // An explicit valid type dictates the group, so no invalid pair is formed:
      ["same-country + PPX", () => ({ ...sampleInput(), serviceType: "PPX" }), "EXP", "PPX"],
      ["cross-country + OND", () => ({ ...crossCountryInput(), serviceType: "OND" }), "DOM", "OND"],
      // A valid type even overrides a conflicting metadata productGroup (DOM+PPX
      // would be invalid, so PPX forces EXP):
      [
        "valid type beats conflicting metadata group",
        () => ({
          ...sampleInput(),
          serviceType: "PPX",
          options: { metadata: { productGroup: "DOM" } },
        }),
        "EXP",
        "PPX",
      ],
      // No explicit type → same-country/cross-country defaults (unchanged):
      ["same-country default", sampleInput, "DOM", "OND"],
      ["cross-country default", crossCountryInput, "EXP", "EPX"],
    ])(
      "%s resolves %s+%s",
      (_scenario, makeInput, expectedGroup, expectedType) => {
        const { productGroup, productType } =
          resolveProductGroupAndType(makeInput());
        expect(productGroup).toBe(expectedGroup);
        expect(productType).toBe(expectedType);
      },
    );
  });
});
