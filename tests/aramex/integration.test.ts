// file: tests/aramex/integration.test.ts
/**
 * Aramex Integration Tests
 * These tests run against the REAL Aramex sandbox API.
 * Requires the following env vars (auto-skipped when ARAMEX_USERNAME is absent):
 *   ARAMEX_USERNAME, ARAMEX_PASSWORD, ARAMEX_ACCOUNT_NUMBER, ARAMEX_ACCOUNT_PIN,
 *   ARAMEX_ACCOUNT_ENTITY, ARAMEX_ACCOUNT_COUNTRY_CODE, ARAMEX_MODE (default sandbox)
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { ShipFlow } from "../../src";
import { AramexAdapter } from "../../src/carriers/aramex";
import type { CreateShipmentInput } from "../../src/core/types";

const USERNAME = process.env.ARAMEX_USERNAME;
const MODE = (process.env.ARAMEX_MODE ?? "sandbox") as "sandbox" | "production";

const describeIf = USERNAME ? describe : describe.skip;

describeIf("Aramex Integration (Sandbox)", () => {
  let adapter: AramexAdapter;
  let createdTrackingNumber: string | null = null;

  beforeAll(() => {
    adapter = new AramexAdapter({
      mode: MODE,
      credentials: {
        userName: USERNAME!,
        password: process.env.ARAMEX_PASSWORD ?? "",
        accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER ?? "",
        accountPin: process.env.ARAMEX_ACCOUNT_PIN ?? "",
        accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY ?? "",
        accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE ?? "SA",
      },
      companyName: "ShipFlow Integration Test",
    });
    // Confirm registration through the client surface too.
    const client = new ShipFlow({ adapters: [adapter] });
    expect(client.carrier("aramex")).toBe(adapter);
  });

  const testInput = (): CreateShipmentInput => ({
    shipper: {
      name: "Test Store",
      company: "ShipFlow Test",
      phone: "966501234567",
      email: "test@shipflow.dev",
      line1: "King Fahd Road, Al Olaya",
      neighbourhood: "Al Olaya",
      city: "Riyadh",
      postalCode: "12211",
      countryCode: "SA",
    },
    consignee: {
      name: "Test Customer",
      phone: "966509876543",
      line1: "Prince Sultan Road",
      neighbourhood: "Al Rawdah",
      city: "Jeddah",
      postalCode: "21577",
      countryCode: "SA",
    },
    parcels: [
      {
        weight: { value: 0.5, unit: "kg" },
        pieces: 1,
        description: "Test Package",
      },
    ],
    declaredValue: { amount: 100, currency: "SAR" },
  });

  test("fetches cities", async () => {
    const cities = await adapter.getCities();
    expect(cities).toBeArray();
    expect(cities.length).toBeGreaterThan(0);
    console.log(`✓ Fetched ${cities.length} cities`);
  });

  test("creates a shipment", async () => {
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

  test("calculates a rate", async () => {
    const rates = await adapter.getRates(testInput());
    expect(rates).toBeArray();
    expect(rates[0]!.carrier).toBe("aramex");
    console.log(`✓ Rate: ${rates[0]!.amount} ${rates[0]!.currency}`);
  });
});
