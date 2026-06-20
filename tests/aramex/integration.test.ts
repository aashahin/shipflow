// file: tests/aramex/integration.test.ts
/**
 * Aramex Integration Tests — REAL sandbox API.
 *
 * These hit Aramex's live JSON Shipping Services. They are GATED behind the
 * `ARAMEX_LIVE` env flag so the normal (offline) suite stays deterministic:
 *
 *   ARAMEX_LIVE=1 bun test tests/aramex/integration.test.ts
 *
 * Credentials default to Aramex's public test account (overridable via env).
 *
 * ⚠️ ACCOUNT IS JORDAN (AccountCountryCode "JO", AccountEntity "AMM") — all
 *    addresses, cities and currency must be Jordan-based, not Saudi. A domestic
 *    JO→JO shipment maps to ProductGroup DOM / ProductType OND.
 *
 * ⚠️ HOST NOTE: the sandbox host `ws.dev.aramex.net` must be reachable from the
 *    runner. Some CI/sandbox networks block it (TCP connect times out) even
 *    though the production host resolves — run these where egress is allowed.
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { ShipFlow } from "../../src";
import { AramexAdapter } from "../../src/carriers/aramex";
import type { CreateShipmentInput } from "../../src/core/types";

const RUN_LIVE = Boolean(process.env.ARAMEX_LIVE ?? Bun.env.ARAMEX_LIVE);

// Public Aramex sandbox/test account (Jordan). Override via env if needed.
const credentials = {
  userName: process.env.ARAMEX_USERNAME ?? "testingapi@aramex.com",
  password: process.env.ARAMEX_PASSWORD ?? "R123456789$r",
  accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER ?? "20016",
  accountPin: process.env.ARAMEX_ACCOUNT_PIN ?? "331421",
  accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY ?? "AMM",
  accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE ?? "JO",
};
const MODE = (process.env.ARAMEX_MODE ?? "sandbox") as "sandbox" | "production";

console.log(
  `Aramex live integration: ${RUN_LIVE ? "✅ enabled" : "⏭️  skipped (set ARAMEX_LIVE=1)"}`,
);

const describeIf = RUN_LIVE ? describe : describe.skip;

describeIf("Aramex Integration (Sandbox, JO account)", () => {
  let adapter: AramexAdapter;
  let createdTrackingNumber: string | null = null;

  beforeAll(() => {
    adapter = new AramexAdapter({ mode: MODE, credentials, companyName: "ShipFlow Test" });
    // Confirm registration through the client surface too.
    const client = new ShipFlow({ adapters: [adapter] });
    expect(client.carrier("aramex")).toBe(adapter);
  });

  // Jordan domestic shipment (Amman → Amman) → ProductGroup DOM / OND.
  const testInput = (): CreateShipmentInput => ({
    shipper: {
      name: "ShipFlow Test Shipper",
      company: "ShipFlow",
      phone: "962790000000",
      email: "test@shipflow.dev",
      line1: "Queen Rania Al Abdullah Street",
      neighbourhood: "Jubeiha",
      city: "Amman",
      countryCode: "JO",
    },
    consignee: {
      name: "ShipFlow Test Consignee",
      phone: "962791111111",
      line1: "Abdulhameed Sharaf Street",
      neighbourhood: "Shmeisani",
      city: "Amman",
      countryCode: "JO",
    },
    parcels: [
      { weight: { value: 0.5, unit: "kg" }, pieces: 1, description: "Test Package" },
    ],
    reference: `SF-${MODE}-test`,
    declaredValue: { amount: 20, currency: "JOD" },
  });

  test("fetches JO cities", async () => {
    const cities = await adapter.getCities();
    expect(cities).toBeArray();
    expect(cities.length).toBeGreaterThan(0);
    console.log(`✓ Fetched ${cities.length} cities`);
  });

  test("fetches JO dropoff offices", async () => {
    const offices = await adapter.getDropoffLocations();
    expect(offices).toBeArray();
    console.log(`✓ Fetched ${offices.length} offices`);
  });

  test("calculates a domestic rate", async () => {
    const rates = await adapter.getRates(testInput());
    expect(rates).toBeArray();
    expect(rates[0]!.carrier).toBe("aramex");
    expect(rates[0]!.amount).toBeGreaterThan(0);
    console.log(`✓ Rate: ${rates[0]!.amount} ${rates[0]!.currency}`);
  });

  test("creates a domestic shipment", async () => {
    const shipment = await adapter.createShipment(testInput());
    expect(shipment.trackingNumber).toBeTruthy();
    expect(shipment.carrier).toBe("aramex");
    expect(shipment.status).toBe("created");
    createdTrackingNumber = shipment.trackingNumber;
    console.log(`✓ Created shipment: ${shipment.trackingNumber}`);
  });

  test("prints the label for the created shipment", async () => {
    if (!createdTrackingNumber) return;
    const url = await adapter.getLabel(createdTrackingNumber);
    expect(url).toContain("http");
    console.log(`✓ Label URL: ${url}`);
  });

  test("tracks the created shipment", async () => {
    if (!createdTrackingNumber) return;
    const result = await adapter.track(createdTrackingNumber);
    expect(result.trackingNumber).toBe(createdTrackingNumber);
    expect(result.carrier).toBe("aramex");
    console.log(`✓ Tracked: ${result.statusLabel}`);
  });
});
