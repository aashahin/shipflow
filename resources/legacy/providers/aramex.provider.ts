import type { Integration } from "@/db/prisma";
import { GlobalError } from "@/lib/errors";
import { AramexSDK, buildDomesticShipment } from "@kareem-3del/aramex-sdk";
import type {
  CreatePickupRequestDto,
  CreateShipmentDto,
  ShipmentAddress,
} from "../../../../../src/modules/tenants/shipments/dto/shipments.dto";

/**
 * Aramex Integration Provider
 * Handles all communication with Aramex API using the SDK
 */
export class AramexProvider {
  private sdk: AramexSDK;
  private integration: Integration;

  constructor(integration: Integration) {
    this.integration = integration;
    this.sdk = this.initializeSDK(integration);
  }

  /**
   * Initialize Aramex SDK with credentials from integration settings
   */
  private initializeSDK(integration: Integration): AramexSDK {
    const settings = integration.settings as any;

    // Validate required credentials
    const requiredFields = [
      "username",
      "password",
      "accountNumber",
      "accountPin",
      "accountEntity",
      "accountCountryCode",
    ];

    const missingFields = requiredFields.filter((field) => !settings[field]);

    if (missingFields.length > 0) {
      throw new GlobalError(
        `Missing Aramex credentials: ${missingFields.join(", ")}`,
        400,
      );
    }

    return new AramexSDK({
      username: settings.username,
      password: settings.password,
      accountNumber: settings.accountNumber,
      accountPin: settings.accountPin,
      accountEntity: settings.accountEntity,
      accountCountryCode: settings.accountCountryCode,
      testMode: Bun.env.NODE_ENV === "development", // Default to test mode
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Create a shipment with Aramex
   */
  async createShipment(data: CreateShipmentDto): Promise<{
    shipmentId: string;
    trackingNumber: string;
    labelUrl?: string;
    carrierResponse: any;
  }> {
    try {
      const settings = this.integration.settings as any;

      // Determine if this is a domestic or international shipment
      const isDomestic = data.fromAddress.country === data.toAddress.country;

      // Build shipment based on type
      const shipmentRequest = isDomestic
        ? this.buildDomesticShipment(data, settings)
        : this.buildInternationalShipment(data, settings);

      // Create shipment with label
      const response = await this.sdk.shipping.createShipment(shipmentRequest, {
        ReportID: 9201, // Standard label format
        ReportType: "URL", // Get label as URL
      });

      // Check for errors
      if (
        !response.HasErrors &&
        response.Shipments &&
        response.Shipments.length > 0
      ) {
        const shipment = response.Shipments[0];

        return {
          shipmentId: shipment.ID,
          trackingNumber: shipment.ID, // Aramex uses shipment ID as tracking number
          labelUrl: shipment.ShipmentLabel?.LabelURL,
          carrierResponse: response,
        };
      } else {
        const errors =
          response.Notifications?.map((n: any) => n.Message).join(", ") ||
          "Unknown error";
        throw new GlobalError(`Aramex API Error: ${errors}`, 400);
      }
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to create Aramex shipment: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Build domestic shipment request
   */
  private buildDomesticShipment(data: CreateShipmentDto, settings: any) {
    const accountNumber = settings.accountNumber;

    return buildDomesticShipment({
      reference: data.reference || data.orderId,
      accountNumber,

      // Shipper (from address)
      fromName: this.getFullName(data.fromAddress),
      fromAddress: this.formatAddress(data.fromAddress),
      fromCity: data.fromAddress.city,
      fromPhone: data.fromAddress.phone,
      fromEmail: data.fromAddress.email,

      // Consignee (to address)
      toName: this.getFullName(data.toAddress),
      toAddress: this.formatAddress(data.toAddress),
      toCity: data.toAddress.city,
      toPhone: data.toAddress.phone,
      toEmail: data.toAddress.email,

      // Package details
      weight: data.weight || 1.0,
      description: data.description || "Package",

      // COD if applicable
      codAmount: data.codAmount,
    });
  }

  /**
   * Build international shipment request
   */
  private buildInternationalShipment(
    data: CreateShipmentDto,
    settings: any,
  ): any {
    const accountNumber = settings.accountNumber;

    return {
      Shipper: {
        Reference1: data.reference || data.orderId,
        Reference2: "",
        AccountNumber: accountNumber,
        PartyAddress: {
          Line1: this.formatAddress(data.fromAddress),
          Line2: data.fromAddress.address2 || "",
          Line3: "",
          City: data.fromAddress.city,
          StateOrProvinceCode: data.fromAddress.state || "",
          PostCode: data.fromAddress.zip,
          CountryCode: data.fromAddress.country,
        },
        Contact: {
          Department: "",
          PersonName: this.getFullName(data.fromAddress),
          Title: "",
          CompanyName: data.fromAddress.company || "",
          PhoneNumber1: data.fromAddress.phone,
          PhoneNumber1Ext: "",
          PhoneNumber2: "",
          PhoneNumber2Ext: "",
          FaxNumber: "",
          CellPhone: data.fromAddress.phone,
          EmailAddress: data.fromAddress.email || "",
          Type: "",
        },
      },
      Consignee: {
        Reference1: "",
        Reference2: "",
        AccountNumber: "",
        PartyAddress: {
          Line1: this.formatAddress(data.toAddress),
          Line2: data.toAddress.address2 || "",
          Line3: "",
          City: data.toAddress.city,
          StateOrProvinceCode: data.toAddress.state || "",
          PostCode: data.toAddress.zip,
          CountryCode: data.toAddress.country,
        },
        Contact: {
          Department: "",
          PersonName: this.getFullName(data.toAddress),
          Title: "",
          CompanyName: data.toAddress.company || "",
          PhoneNumber1: data.toAddress.phone,
          PhoneNumber1Ext: "",
          PhoneNumber2: "",
          PhoneNumber2Ext: "",
          FaxNumber: "",
          CellPhone: data.toAddress.phone,
          EmailAddress: data.toAddress.email || "",
          Type: "",
        },
      },
      ThirdParty: {
        Reference1: "",
        Reference2: "",
        AccountNumber: "",
        PartyAddress: {
          Line1: "",
          Line2: "",
          Line3: "",
          City: "",
          StateOrProvinceCode: "",
          PostCode: "",
          CountryCode: "",
        },
        Contact: {
          Department: "",
          PersonName: "",
          Title: "",
          CompanyName: "",
          PhoneNumber1: "",
          PhoneNumber1Ext: "",
          PhoneNumber2: "",
          PhoneNumber2Ext: "",
          FaxNumber: "",
          CellPhone: "",
          EmailAddress: "",
          Type: "",
        },
      },
      ShippingDateTime: new Date().toISOString(),
      DueDate: data.pickupDate || new Date().toISOString(),
      Comments: data.notes || "",
      PickupLocation: "",
      OperationsInstructions: "",
      AccountingInstrcutions: "",
      Details: {
        Dimensions:
          data.length && data.width && data.height
            ? {
              Length: data.length,
              Width: data.width,
              Height: data.height,
              Unit: "CM",
            }
            : undefined,
        ActualWeight: {
          Unit: "KG",
          Value: data.weight || 1.0,
        },
        ChargeableWeight: undefined,
        DescriptionOfGoods: data.description || "Package",
        GoodsOriginCountry: data.fromAddress.country,
        NumberOfPieces: data.pieces || 1,
        ProductGroup: "EXP", // Express for international
        ProductType: data.dutiable ? "PPX" : "PDX", // Parcel or Document Express
        PaymentType: "P", // Prepaid
        PaymentOptions: "",
        Services: this.buildServices(data),
        CashOnDeliveryAmount: data.codAmount
          ? {
            CurrencyCode: data.codCurrency || data.currency || "USD",
            Value: data.codAmount,
          }
          : undefined,
        InsuranceAmount: undefined,
        CollectAmount: undefined,
        CashAdditionalAmount: undefined,
        CashAdditionalAmountDescription: "",
        CustomsValueAmount: data.customsValue
          ? {
            CurrencyCode: data.customsCurrency || data.currency || "USD",
            Value: data.customsValue,
          }
          : undefined,
        Items: [],
      },
    };
  }

  /**
   * Build services string based on shipment requirements
   */
  private buildServices(data: CreateShipmentDto): string {
    const services: string[] = [];

    if (data.codAmount && data.codAmount > 0) {
      services.push("CODS");
    }

    // Add signature required for valuable shipments
    if (data.customsValue && data.customsValue > 1000) {
      services.push("SIG");
    }

    return services.join(",");
  }

  /**
   * Track a shipment
   */
  async trackShipment(trackingNumber: string): Promise<{
    status: string;
    events: Array<{
      status: string;
      description: string;
      location?: string;
      occurredAt: Date;
      rawData?: any;
    }>;
    rawResponse: any;
  }> {
    try {
      const response = await this.sdk.tracking.trackShipment(trackingNumber);

      if (!response.HasErrors && response.TrackingResults?.length > 0) {
        const tracking = response.TrackingResults[0];
        const updates = Array.isArray(tracking.UpdateDescription)
          ? tracking.UpdateDescription
          : [];

        // Map Aramex updates to our event format
        const events = updates.map((update: any) => ({
          status: this.mapAramexStatusToInternal(update.UpdateCode || ""),
          description: update.UpdateDescription || "Status update",
          location: update.UpdateLocation,
          occurredAt: new Date(update.UpdateDateTime || new Date()),
          rawData: update,
        }));

        // Get the latest status - default to in_transit if no specific status
        const latestStatus =
          events.length > 0 ? events[0].status : "in_transit";

        return {
          status: latestStatus,
          events: events.reverse(), // Oldest first
          rawResponse: response,
        };
      } else {
        throw new GlobalError("Tracking information not available", 404);
      }
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(`Failed to track shipment: ${error.message}`, 500);
    }
  }

  /**
   * Create a pickup request
   */
  async createPickup(data: CreatePickupRequestDto): Promise<{
    pickupId: string;
    pickupNumber?: string;
    carrierResponse: any;
  }> {
    try {
      const pickupRequest = {
        PickupAddress: {
          Line1: this.formatAddress(data.pickupAddress),
          Line2: data.pickupAddress.address2 || "",
          Line3: "",
          City: data.pickupAddress.city,
          StateOrProvinceCode: data.pickupAddress.state || "",
          PostCode: data.pickupAddress.zip,
          CountryCode: data.pickupAddress.country,
        },
        PickupContact: {
          Department: "",
          PersonName: data.contactName,
          Title: "",
          CompanyName: data.pickupAddress.company || "",
          PhoneNumber1: data.contactPhone,
          PhoneNumber1Ext: "",
          PhoneNumber2: "",
          PhoneNumber2Ext: "",
          FaxNumber: "",
          CellPhone: data.contactPhone,
          EmailAddress: data.contactEmail || "",
          Type: "",
        },
        PickupLocation: data.location || "",
        PickupDate: data.pickupDate,
        ReadyTime: data.readyTime,
        LastPickupTime: data.closingTime,
        ClosingTime: data.closingTime,
        Comments: data.notes || "",
        Reference1: data.reference || "",
        Reference2: "",
        Vehicle: "",
        Shipments: undefined,
        PickupItems: [
          {
            ProductGroup: "EXP" as const,
            ProductType: "PPX" as const,
            NumberOfShipments: 1,
            PackageType: "Box",
            Payment: "P" as const,
            ShipmentWeight: {
              Unit: "KG" as const,
              Value: data.totalWeight,
            },
            ShipmentVolume: undefined,
            NumberOfPieces: data.totalPieces,
            CashAmount: undefined,
            ExtraCharges: undefined,
            ShipmentDimensions: undefined,
            Comments: data.notes || "",
          },
        ],
        Status: "Ready" as const,
        ExistingShipments: null,
      };

      const response = await this.sdk.shipping.createPickup(pickupRequest);

      if (!response.HasErrors && response.ProcessedPickup) {
        return {
          pickupId: response.ProcessedPickup.ID,
          pickupNumber: response.ProcessedPickup.GUID,
          carrierResponse: response,
        };
      } else {
        const errors =
          response.Notifications?.map((n: any) => n.Message).join(", ") ||
          "Unknown error";
        throw new GlobalError(`Aramex API Error: ${errors}`, 400);
      }
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to create Aramex pickup: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Cancel a pickup
   */
  async cancelPickup(
    pickupGUID: string,
    comments?: string,
  ): Promise<{ success: boolean; carrierResponse: any }> {
    try {
      const response = await this.sdk.shipping.cancelPickup(
        pickupGUID,
        comments,
      );

      if (!response.HasErrors) {
        return {
          success: true,
          carrierResponse: response,
        };
      } else {
        const errors =
          response.Notifications?.map((n: any) => n.Message).join(", ") ||
          "Unknown error";
        throw new GlobalError(`Aramex API Error: ${errors}`, 400);
      }
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to cancel Aramex pickup: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Calculate shipping rate
   */
  async calculateRate(
    fromAddress: ShipmentAddress,
    toAddress: ShipmentAddress,
    weight: number,
    dimensions?: { length: number; width: number; height: number },
  ): Promise<{
    totalAmount: number;
    currency: string;
    carrierResponse: any;
  }> {
    try {
      const request = {
        OriginAddress: {
          Line1: "",
          Line2: "",
          Line3: "",
          City: fromAddress.city,
          StateOrProvinceCode: fromAddress.state || "",
          PostCode: fromAddress.zip,
          CountryCode: fromAddress.country,
        },
        DestinationAddress: {
          Line1: "",
          Line2: "",
          Line3: "",
          City: toAddress.city,
          StateOrProvinceCode: toAddress.state || "",
          PostCode: toAddress.zip,
          CountryCode: toAddress.country,
        },
        ShipmentDetails: {
          Dimensions: dimensions
            ? {
              Length: dimensions.length,
              Width: dimensions.width,
              Height: dimensions.height,
              Unit: "CM" as const,
            }
            : undefined,
          ActualWeight: {
            Unit: "KG" as const,
            Value: weight,
          },
          ChargeableWeight: undefined,
          DescriptionOfGoods: "",
          GoodsOriginCountry: fromAddress.country,
          NumberOfPieces: 1,
          ProductGroup: (fromAddress.country === toAddress.country
            ? "DOM"
            : "EXP") as any,
          ProductType: (fromAddress.country === toAddress.country
            ? "OND"
            : "PPX") as any,
          PaymentType: "P" as const,
          PaymentOptions: "",
          Services: "",
          CashOnDeliveryAmount: undefined,
          InsuranceAmount: undefined,
          CollectAmount: undefined,
          CashAdditionalAmount: undefined,
          CashAdditionalAmountDescription: "",
          CustomsValueAmount: undefined,
          Items: [],
        },
      };

      const response = await this.sdk.rate.calculateRate(request);

      if (!response.HasErrors && response.TotalAmount) {
        return {
          totalAmount: response.TotalAmount.Value,
          currency: response.TotalAmount.CurrencyCode,
          carrierResponse: response,
        };
      } else {
        const errors =
          response.Notifications?.map((n: any) => n.Message).join(", ") ||
          "Unknown error";
        throw new GlobalError(`Aramex API Error: ${errors}`, 400);
      }
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to calculate Aramex rate: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Validate address with Aramex
   */
  async validateAddress(address: ShipmentAddress): Promise<{
    isValid: boolean;
    suggestions?: any[];
    carrierResponse: any;
  }> {
    try {
      const addressToValidate = {
        Line1: this.formatAddress(address),
        Line2: address.address2 || "",
        Line3: "",
        City: address.city,
        StateOrProvinceCode: address.state || "",
        PostCode: address.zip,
        CountryCode: address.country,
      };

      const response =
        await this.sdk.location.validateAddress(addressToValidate);

      return {
        isValid: !response.HasErrors,
        suggestions: response.SuggestedAddresses || [],
        carrierResponse: response,
      };
    } catch (error: any) {
      throw new GlobalError(
        `Failed to validate address: ${error.message}`,
        500,
      );
    }
  }

  // Helper methods

  private getFullName(address: ShipmentAddress): string {
    return `${address.firstName} ${address.lastName}`.trim();
  }

  private formatAddress(address: ShipmentAddress): string {
    return address.address1;
  }

  /**
   * Map Aramex status codes to internal shipment statuses
   */
  private mapAramexStatusToInternal(aramexStatus: string): string {
    const statusMap: Record<string, string> = {
      // Pending/Initial
      SH001: "pending",
      SH002: "label_created",

      // Picked up
      SH003: "picked_up",
      SH004: "picked_up",

      // In transit
      SH005: "in_transit",
      SH006: "in_transit",
      SH007: "in_transit",
      SH008: "in_transit",
      SH009: "in_transit",
      SH010: "in_transit",

      // Out for delivery
      SH011: "out_for_delivery",
      SH012: "out_for_delivery",

      // Delivered
      SH013: "delivered",
      SH014: "delivered",

      // Failed/Exceptions
      SH015: "failed",
      SH016: "failed",
      SH017: "failed",

      // Returned
      SH018: "returned",
      SH019: "returned",

      // Cancelled
      SH020: "cancelled",
    };

    return statusMap[aramexStatus] || "in_transit";
  }
}

/**
 * Factory function to create Aramex provider
 */
export async function createAramexProvider(
  integration: Integration,
): Promise<AramexProvider> {
  if (integration.type !== "shipping_provider") {
    throw new GlobalError("Integration is not a shipping provider", 400);
  }

  if (integration.code !== "aramex") {
    throw new GlobalError("Integration is not an Aramex provider", 400);
  }

  if (!integration.isActive) {
    throw new GlobalError("Aramex integration is not active", 400);
  }

  return new AramexProvider(integration);
}
