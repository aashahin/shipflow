// file: src/client.ts
/**
 * ShipFlow Client
 * Tree-shakeable factory that accepts carrier adapters via dependency injection.
 * Only the carriers you inject will be bundled in your final application.
 */

import type { CarrierAdapter } from './carriers/base';
import type { CreateShipmentInput, Rate, TrackingResult } from './core/types';
import { ShipFlowError } from './core/errors';

export interface ShipFlowOptions {
    adapters: CarrierAdapter[];
}

export class ShipFlow {
    private adapters: Map<string, CarrierAdapter>;

    constructor(options: ShipFlowOptions) {
        this.adapters = new Map();

        for (const adapter of options.adapters) {
            this.adapters.set(adapter.name, adapter);
        }
    }

    /**
     * Get a specific carrier adapter by name.
     * @throws ShipFlowError if carrier is not configured
     */
    carrier(name: string): CarrierAdapter {
        const adapter = this.adapters.get(name.toLowerCase());
        if (!adapter) {
            throw new ShipFlowError(`Carrier "${name}" is not configured`, { carrier: name });
        }
        return adapter;
    }

    /**
     * Get all configured carrier names.
     */
    get carriers(): string[] {
        return [...this.adapters.keys()];
    }

    /**
     * Check if a carrier is configured.
     */
    hasCarrier(name: string): boolean {
        return this.adapters.has(name.toLowerCase());
    }

    /**
     * Get rates from all configured carriers that support rate calculation.
     * Returns a map of carrier name to rates (or error).
     */
    async getRatesFromAll(input: CreateShipmentInput): Promise<Map<string, Rate[] | Error>> {
        const results = new Map<string, Rate[] | Error>();

        const promises = [...this.adapters.entries()].map(async ([name, adapter]) => {
            if (!adapter.getRates) {
                return; // Skip carriers that don't support rates
            }

            try {
                const rates = await adapter.getRates(input);
                results.set(name, rates);
            } catch (error) {
                results.set(name, error instanceof Error ? error : new Error(String(error)));
            }
        });

        await Promise.allSettled(promises);
        return results;
    }

    /**
     * Try to track a shipment across all configured carriers.
     * Useful when you don't know which carrier handles a tracking number.
     * Returns the first successful result.
     */
    async trackAcrossCarriers(trackingNumber: string): Promise<TrackingResult | null> {
        for (const [, adapter] of this.adapters) {
            try {
                const result = await adapter.track(trackingNumber);
                if (result && result.status !== 'unknown') {
                    return result;
                }
            } catch {
                // Continue to next carrier
            }
        }
        return null;
    }
}

/**
 * Factory function for creating ShipFlow client.
 * This is the recommended way to instantiate the client.
 */
export function createShipFlow(options: ShipFlowOptions): ShipFlow {
    return new ShipFlow(options);
}
