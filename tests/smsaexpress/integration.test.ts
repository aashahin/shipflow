// file: tests/smsaexpress/integration.test.ts
/**
 * SMSA Express Integration Tests
 * These tests run against the REAL SMSA Express sandbox API.
 * Requires: SMSAEXPRESS_API_KEY and SMSAEXPRESS_MODE=sandbox in .env
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { ShipFlow } from "../../src";
import {
  SMSAExpressAdapter,
  SMSAService,
} from "../../src/carriers/smsaexpress";
import type { City, CreateShipmentInput } from "../../src/core/types";

const API_KEY = process.env.SMSAEXPRESS_API_KEY || Bun.env.SMSAEXPRESS_API_KEY;
const MODE = (process.env.SMSAEXPRESS_MODE ??
  Bun.env.SMSAEXPRESS_MODE ??
  "sandbox") as "sandbox" | "production";
console.log(
  `Using SMSA Express API Key: ${API_KEY ? "✅ Found" : "❌ Not Found"}`,
);

// Skip all tests if no API key is set
const describeIf = API_KEY ? describe : describe.skip;

describeIf("SMSA Express Integration (Sandbox)", () => {
  let client: ShipFlow;
  let adapter: SMSAExpressAdapter;
  let createdTrackingNumber: string | null = null;

  beforeAll(() => {
    adapter = new SMSAExpressAdapter({
      mode: MODE,
      credentials: { apiKey: API_KEY! },
    });
    client = new ShipFlow({ adapters: [adapter] });
  });

  // =========================================================================
  // LOOKUP APIS
  // =========================================================================

  describe("Lookup APIs", () => {
    test("fetches cities for SA", async () => {
      const cities = await adapter.getCities("SA");

      expect(cities).toBeArray();
      expect(cities.length).toBeGreaterThan(0);

      const riyadh = cities.find((c: City) => c.nameEn === "Riyadh");
      expect(riyadh).toBeDefined();
      expect(riyadh?.code).toBe("RUH");

      console.log(`✓ Fetched ${cities.length} SA cities`);
    });

    test("fetches SMSA offices", async () => {
      const offices = await adapter.getDropoffLocations();

      expect(offices).toBeArray();
      expect(offices.length).toBeGreaterThan(0);

      const riyadhOffice = offices.find((o) => o.city === "Riyadh");
      expect(riyadhOffice).toBeDefined();

      console.log(`✓ Fetched ${offices.length} SMSA offices`);
    });
  });

  // =========================================================================
  // SHIPPING
  // =========================================================================

  describe("Shipping API", () => {
    const testShipmentInput: CreateShipmentInput = {
      shipper: {
        name: "ShipFlow Test Shipper",
        phone: "96600000000",
        line1: "SMSA Express HQ, Dababh St",
        neighbourhood: "Sulimanyah",
        city: "Riyadh",
        postalCode: "63529",
        countryCode: "SA",
      },
      consignee: {
        name: "ShipFlow Test Consignee",
        phone: "966000000",
        line1: "سمسا حي الروضة Test Address",
        neighbourhood: "Ar Rawdah",
        city: "Jeddah",
        countryCode: "SA",
      },
      parcels: [
        {
          weight: { value: 3, unit: "kg" },
          pieces: 1,
          description: "Integration test shipment",
        },
      ],
      serviceType: SMSAService.ECOMMERCE_DELIVERY,
      reference: `SHIPFLOW-TEST-${Date.now()}`,
      declaredValue: { amount: 10, currency: "SAR" },
    };

    test("creates B2C shipment without COD", async () => {
      const shipment = await adapter.createShipment(testShipmentInput);

      expect(shipment.trackingNumber).toBeTruthy();
      expect(shipment.carrier).toBe("smsaexpress");
      expect(shipment.status).toBe("created");

      createdTrackingNumber = shipment.trackingNumber;
      console.log(`✓ Created shipment: ${shipment.trackingNumber}`);
    });

    test("creates B2C shipment with COD", async () => {
      const codInput: CreateShipmentInput = {
        ...testShipmentInput,
        cod: { enabled: true, amount: 50, currency: "SAR" },
        reference: `SHIPFLOW-COD-${Date.now()}`,
      };

      const shipment = await adapter.createShipment(codInput);

      expect(shipment.trackingNumber).toBeTruthy();
      expect(shipment.codAmount).toBe(50);

      console.log(
        `✓ Created COD shipment: ${shipment.trackingNumber} (COD: ${shipment.codAmount} SAR)`,
      );
    });

    test("tracks created shipment", async () => {
      if (!createdTrackingNumber) {
        console.log("⚠ Skipping: No tracking number from previous test");
        return;
      }

      const result = await adapter.track(createdTrackingNumber);

      expect(result.trackingNumber).toBe(createdTrackingNumber);
      expect(result.carrier).toBe("smsaexpress");
      expect(result.events).toBeArray();

      console.log(`✓ Tracked shipment: ${result.trackingNumber}`);
      console.log(`  Status: ${result.statusLabel}`);
      console.log(`  Events: ${result.events.length}`);
    });

    test("gets label for shipment", async () => {
      if (!createdTrackingNumber) {
        console.log("⚠ Skipping: No tracking number from previous test");
        return;
      }

      const label = await adapter.getLabel(createdTrackingNumber);

      expect(label).toContain("data:application/pdf;base64,");
      console.log(`✓ Got label (${label.length} chars base64)`);
    });
  });

  // =========================================================================
  // CLIENT ACCESS
  // =========================================================================

  describe("ShipFlow Client", () => {
    test("accesses adapter via client.carrier()", () => {
      const carrierAdapter = client.carrier("smsaexpress");
      expect(carrierAdapter.name).toBe("smsaexpress");
    });

    test("lists smsaexpress in configured carriers", () => {
      expect(client.carriers).toContain("smsaexpress");
    });
  });
});
