// file: tests/aymakan/integration.test.ts
/**
 * Aymakan Integration Tests
 * These tests run against the REAL Aymakan sandbox API.
 * Requires: AYMAKAN_API_KEY and AYMAKAN_MODE=sandbox in .env
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { ShipFlow } from '../../src';
import { AymakanAdapter, AymakanService } from '../../src/carriers/aymakan';
import type { CreateShipmentInput, City, Pickup } from '../../src/core/types';

const API_KEY = process.env.AYMAKAN_API_KEY;
const MODE = (process.env.AYMAKAN_MODE ?? 'sandbox') as 'sandbox' | 'production';

// Skip all tests if no API key is set
const describeIf = API_KEY ? describe : describe.skip;

describeIf('Aymakan Integration (Sandbox)', () => {
    let client: ShipFlow;
    let adapter: AymakanAdapter;
    let createdTrackingNumber: string | null = null;

    beforeAll(() => {
        adapter = new AymakanAdapter({
            mode: MODE,
            credentials: { apiKey: API_KEY! },
        });
        client = new ShipFlow({ adapters: [adapter] });
    });

    // =========================================================================
    // CITIES (Public API - no auth needed)
    // =========================================================================
    describe('Cities API', () => {
        test('fetches all cities', async () => {
            const cities = await adapter.getCities();

            expect(cities).toBeArray();
            expect(cities.length).toBeGreaterThan(0);

            const riyadh = cities.find((c: City) => c.nameEn === 'Riyadh');
            expect(riyadh).toBeDefined();
            expect(riyadh?.nameAr).toBe('الرياض');

            console.log(`✓ Fetched ${cities.length} cities`);
        });

        test('fetches pickup cities', async () => {
            const cities = await adapter.getPickupCities();

            expect(cities).toBeArray();
            expect(cities.length).toBeGreaterThan(0);
            console.log(`✓ Fetched ${cities.length} pickup cities`);
        });
    });

    // =========================================================================
    // SHIPPING
    // =========================================================================
    describe('Shipping API', () => {
        const testShipmentInput: CreateShipmentInput = {
            shipper: {
                name: 'Test Store',
                company: 'ShipFlow Test',
                phone: '966501234567',
                email: 'test@shipflow.dev',
                line1: 'King Fahd Road, Al Olaya',
                neighbourhood: 'Al Olaya',
                city: 'Riyadh',
                postalCode: '12211',
                countryCode: 'SA',
            },
            consignee: {
                name: 'Test Customer',
                phone: '966509876543',
                email: 'customer@test.com',
                line1: 'Prince Sultan Road',
                neighbourhood: 'Al Rawdah',
                city: 'Jeddah',
                postalCode: '21577',
                countryCode: 'SA',
            },
            parcels: [
                {
                    weight: { value: 0.5, unit: 'kg' },
                    pieces: 1,
                    itemsCount: 1,
                    description: 'Test Package',
                },
            ],
            serviceType: AymakanService.ECOMMERCE,
            declaredValue: { amount: 100, currency: 'SAR' },
            options: {
                requestedBy: 'ShipFlow Integration Test',
            },
        };

        test('creates shipment without COD', async () => {
            const shipment = await adapter.createShipment(testShipmentInput);

            expect(shipment.trackingNumber).toMatch(/^AY\d+$/);
            expect(shipment.carrier).toBe('aymakan');
            expect(shipment.status).toBe('created');
            // Note: Aymakan sandbox only returns pdf_label, not the PNG label
            expect(shipment.pdfLabelUrl).toContain('http');

            createdTrackingNumber = shipment.trackingNumber;
            console.log(`✓ Created shipment: ${shipment.trackingNumber}`);
            console.log(`  Label URL: ${shipment.pdfLabelUrl}`);
        });

        test('creates shipment WITH COD', async () => {
            const codInput: CreateShipmentInput = {
                ...testShipmentInput,
                cod: { enabled: true, amount: 150, currency: 'SAR' },
                reference: `TEST-COD-${Date.now()}`,
            };

            const shipment = await adapter.createShipment(codInput);

            expect(shipment.trackingNumber).toMatch(/^AY\d+$/);
            expect(shipment.codAmount).toBe(150);

            console.log(`✓ Created COD shipment: ${shipment.trackingNumber} (COD: ${shipment.codAmount} SAR)`);
        });

        test('tracks created shipment', async () => {
            if (!createdTrackingNumber) {
                console.log('⚠ Skipping: No tracking number from previous test');
                return;
            }

            const result = await adapter.track(createdTrackingNumber);

            expect(result.trackingNumber).toBe(createdTrackingNumber);
            expect(result.carrier).toBe('aymakan');
            expect(result.events).toBeArray();
            expect(result.events.length).toBeGreaterThan(0);

            console.log(`✓ Tracked shipment: ${result.trackingNumber}`);
            console.log(`  Status: ${result.statusLabel}`);
            console.log(`  Events: ${result.events.length}`);
        });

        test('gets label for shipment', async () => {
            if (!createdTrackingNumber) {
                console.log('⚠ Skipping: No tracking number from previous test');
                return;
            }

            const labelUrl = await adapter.getLabel(createdTrackingNumber);

            expect(labelUrl).toContain('http');
            console.log(`✓ Label URL: ${labelUrl}`);
        });

        test('cancels shipment', async () => {
            if (!createdTrackingNumber) {
                console.log('⚠ Skipping: No tracking number from previous test');
                return;
            }

            const cancelled = await adapter.cancelShipment(createdTrackingNumber);

            expect(cancelled).toBe(true);
            console.log(`✓ Cancelled shipment: ${createdTrackingNumber}`);
        });
    });

    // =========================================================================
    // WEBHOOK PARSING (No API call, just logic test)
    // =========================================================================
    describe('Webhook Parsing', () => {
        test('parses delivered webhook', () => {
            const payload = {
                tracking_number: 'AY4447538242',
                reference: '56325059',
                status: 'AY-0005',
                status_label: 'Delivered',
                reason_code: null,
                reason_en: null,
                date_time: '2026-01-22T15:41:26.000000Z',
                event: 'status_update' as const,
                delivery_name: 'Ahmed',
                delivery_city: 'Riyadh',
                cod_amount: '0.00',
                pieces: 1,
                weight: '0.494',
                tracking_info: [],
            };

            const event = adapter.parseWebhook(payload);

            expect(event.trackingNumber).toBe('AY4447538242');
            expect(event.status).toBe('delivered');
            expect(event.eventType).toBe('status_update');
            expect(event.reference).toBe('56325059');

            console.log(`✓ Parsed webhook: ${event.trackingNumber} -> ${event.status}`);
        });

        test('parses pending webhook with reason', () => {
            const payload = {
                tracking_number: 'AY4335935224',
                reference: '56148320',
                status: 'AY-0032',
                status_label: 'Pending',
                reason_code: 'AY-0048',
                reason_en: 'Future Delivery',
                date_time: '2026-01-22T06:17:34.000000Z',
                event: 'status_update' as const,
                delivery_name: 'Test',
                delivery_city: 'Riyadh',
                cod_amount: '177.98',
                pieces: 1,
                weight: '0.494',
                tracking_info: [],
            };

            const event = adapter.parseWebhook(payload);

            expect(event.status).toBe('pending');
            expect(event.reasonCode).toBe('AY-0048');
            expect(event.reasonLabel).toBe('Future Delivery');

            console.log(`✓ Parsed webhook with reason: ${event.reasonLabel}`);
        });
    });
});
