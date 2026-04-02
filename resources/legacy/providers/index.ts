import type { Integration } from "@/db/prisma";
import { GlobalError } from "@/lib/errors";
import type {
  CreatePickupRequestDto,
  CreateShipmentDto,
} from "../../../../../src/modules/tenants/shipments/dto/shipments.dto";
import { createAramexProvider } from "./aramex.provider";
import { createDHLExpressProvider } from "./dhl.provider";

/**
 * Common interface for all shipping providers
 */
export interface IShippingProvider {
  createShipment(data: CreateShipmentDto): Promise<{
    shipmentId: string;
    trackingNumber: string;
    labelUrl?: string;
    carrierResponse: any;
  }>;

  trackShipment(trackingNumber: string): Promise<{
    status: string;
    events: Array<{
      status: string;
      description: string;
      location?: string;
      occurredAt: Date;
      rawData?: any;
    }>;
    rawResponse: any;
  }>;

  createPickup(data: CreatePickupRequestDto): Promise<{
    pickupId: string;
    pickupNumber?: string;
    carrierResponse: any;
  }>;

  cancelPickup(
    pickupId: string,
    comments?: string,
  ): Promise<{ success: boolean; carrierResponse: any }>;

  calculateRate(
    fromAddress: any,
    toAddress: any,
    weight: number,
    dimensions?: { length: number; width: number; height: number },
  ): Promise<{
    totalAmount: number;
    currency: string;
    carrierResponse: any;
  }>;

  validateAddress(address: any): Promise<{
    isValid: boolean;
    suggestions?: any[];
    carrierResponse: any;
  }>;
}

/**
 * Supported shipping provider codes
 */
export enum ShippingProviderCode {
  ARAMEX = "aramex",
  DHL = "dhl",
  FEDEX = "fedex",
  UPS = "ups",
  // Add more providers as needed
}

/**
 * Factory to create shipping provider instances
 */
export class ShippingProviderFactory {
  /**
   * Create a shipping provider instance based on integration
   */
  static async create(integration: Integration): Promise<IShippingProvider> {
    if (integration.type !== "shipping_provider") {
      throw new GlobalError("Integration is not a shipping provider", 400);
    }

    if (!integration.isActive) {
      throw new GlobalError(
        `${integration.name} integration is not active`,
        400,
      );
    }

    switch (integration.code.toLowerCase()) {
      case ShippingProviderCode.ARAMEX:
        return createAramexProvider(integration);

      case ShippingProviderCode.DHL:
        return createDHLExpressProvider(integration);

      case ShippingProviderCode.FEDEX:
        throw new GlobalError("FedEx provider not yet implemented", 501);

      case ShippingProviderCode.UPS:
        throw new GlobalError("UPS provider not yet implemented", 501);

      default:
        throw new GlobalError(
          `Unsupported shipping provider: ${integration.code}`,
          400,
        );
    }
  }
}
