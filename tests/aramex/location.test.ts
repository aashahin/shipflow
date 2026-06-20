// file: tests/aramex/location.test.ts
/**
 * Aramex Location Tests (FetchCities / FetchOffices)
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

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

describe("AramexAdapter — location", () => {
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

  test("getCities maps the bare string list", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        Cities: ["Riyadh", "Jeddah", "Dammam"],
      }),
    );

    const cities = await adapter.getCities();

    expect(cities).toEqual([
      { nameEn: "Riyadh" },
      { nameEn: "Jeddah" },
      { nameEn: "Dammam" },
    ]);

    const [url, init] = mockFetch.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/Location/Service_1_0.svc/json/FetchCities");
    expect(JSON.parse(init.body as string).CountryCode).toBe("SA");
  });

  test("getCities honors an explicit country code", async () => {
    mockFetch.mockResolvedValueOnce(
      json({ HasErrors: false, Notifications: [], Cities: ["Dubai"] }),
    );

    await adapter.getCities("AE");

    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).CountryCode).toBe("AE");
  });

  test("getDropoffLocations maps offices to Location", async () => {
    mockFetch.mockResolvedValueOnce(
      json({
        HasErrors: false,
        Notifications: [],
        Offices: [
          {
            EntityCode: "RUH",
            EntityName: "Riyadh Main Office",
            Address: {
              Line1: "Exit 18, Eastern Ring Road",
              City: "Riyadh",
              CountryCode: "SA",
              Latitude: 24.7136,
              Longitude: 46.6753,
            },
          },
        ],
      }),
    );

    const locations = await adapter.getDropoffLocations();

    expect(locations).toHaveLength(1);
    expect(locations[0]!.id).toBe("RUH");
    expect(locations[0]!.name).toBe("Riyadh Main Office");
    expect(locations[0]!.city).toBe("Riyadh");
    expect(locations[0]!.latitude).toBe(24.7136);
    expect(locations[0]!.longitude).toBe(46.6753);

    const [url] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/Location/Service_1_0.svc/json/FetchOffices");
  });
});
