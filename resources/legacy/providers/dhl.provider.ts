import type { Integration } from "@/db/prisma";
import { GlobalError } from "@/lib/errors";
import type {
  CreatePickupRequestDto,
  CreateShipmentDto,
  ShipmentAddress,
} from "../../../../../src/modules/tenants/shipments/dto/shipments.dto";

/**
 * DHL Express Integration Provider
 * Handles all communication with DHL Express API
 * Documentation: https://developer.dhl.com/api-reference/dhl-express-mydhli-rest-api
 */
export class DHLExpressProvider {
  private baseUrl!: string;
  private apiKey!: string;
  private apiSecret!: string;
  private accountNumber!: string;

  constructor(integration: Integration) {
    this.validateAndSetCredentials(integration);
  }

  /**
   * Validate and set DHL credentials from integration settings
   */
  private validateAndSetCredentials(integration: Integration): void {
    const settings = integration.settings as any;

    // Validate required credentials
    const requiredFields = ["apiKey", "apiSecret", "accountNumber"];

    const missingFields = requiredFields.filter((field) => !settings[field]);

    if (missingFields.length > 0) {
      throw new GlobalError(
        `Missing DHL Express credentials: ${missingFields.join(", ")}`,
        400,
      );
    }

    this.apiKey = settings.apiKey;
    this.apiSecret = settings.apiSecret;
    this.accountNumber = settings.accountNumber;

    // Set base URL based on environment
    this.baseUrl =
      settings.testMode || Bun.env.NODE_ENV === "development"
        ? "https://express.api.dhl.com/mydhlapi/test"
        : "https://express.api.dhl.com/mydhlapi";
  }

  /**
   * Get authorization header for API requests
   */
  private getAuthHeader(): string {
    const credentials = `${this.apiKey}:${this.apiSecret}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  /**
   * Make authenticated API request to DHL
   */
  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.detail || data.message || "DHL API request failed";
        throw new GlobalError(
          `DHL API Error: ${errorMessage}`,
          response.status,
        );
      }

      return data;
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to communicate with DHL API: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Create a shipment with DHL Express
   */
  async createShipment(data: CreateShipmentDto): Promise<{
    shipmentId: string;
    trackingNumber: string;
    labelUrl?: string;
    carrierResponse: any;
  }> {
    try {
      // Validate addresses for DHL
      this.validateAddresses(data.fromAddress, data.toAddress);

      // Build shipment request
      const shipmentRequest = this.buildShipmentRequest(data);

      // Create shipment
      const response = await this.makeRequest(
        "/shipments",
        "POST",
        shipmentRequest,
      );

      // Extract shipment details
      const shipmentId =
        response.shipmentTrackingNumber || response.dispatchConfirmationNumber;
      const trackingNumber = response.shipmentTrackingNumber;

      // Get label URL from documents
      let labelUrl: string | undefined;
      if (response.documents && response.documents.length > 0) {
        const labelDoc = response.documents.find(
          (doc: any) =>
            doc.typeCode === "label" || doc.typeCode === "waybillDoc",
        );
        if (labelDoc && labelDoc.content) {
          // DHL returns base64 encoded PDF - you may want to upload to storage
          labelUrl = `data:application/pdf;base64,${labelDoc.content}`;
        }
      }

      return {
        shipmentId,
        trackingNumber,
        labelUrl,
        carrierResponse: response,
      };
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to create DHL shipment: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Build DHL shipment request payload
   */
  private buildShipmentRequest(data: CreateShipmentDto): any {
    const plannedShippingDate = data.pickupDate
      ? new Date(data.pickupDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return {
      plannedShippingDateAndTime: plannedShippingDate,
      pickup: {
        isRequested: data.pickupRequired || false,
      },
      productCode: this.determineProductCode(data),
      accounts: [
        {
          typeCode: "shipper",
          number: this.accountNumber,
        },
      ],
      customerDetails: {
        shipperDetails: {
          postalAddress: this.buildDHLAddress(data.fromAddress),
          contactInformation: {
            email: data.fromAddress.email || "",
            phone: data.fromAddress.phone,
            mobilePhone: data.fromAddress.phone,
            companyName: data.fromAddress.company || "Company",
            fullName: this.getFullName(data.fromAddress),
          },
        },
        receiverDetails: {
          postalAddress: this.buildDHLAddress(data.toAddress),
          contactInformation: {
            email: data.toAddress.email || "",
            phone: data.toAddress.phone,
            mobilePhone: data.toAddress.phone,
            companyName: data.toAddress.company || "Company",
            fullName: this.getFullName(data.toAddress),
          },
        },
      },
      content: {
        packages: this.buildPackages(data),
        isCustomsDeclarable: data.dutiable || false,
        declaredValue: data.customsValue,
        declaredValueCurrency: data.customsCurrency || data.currency || "USD",
        description: data.description || "Shipment",
        incoterm: "DAP", // Delivered At Place
        unitOfMeasurement: "metric",
      },
      outputImageProperties: {
        printerDPI: 300,
        encodingFormat: "pdf",
        imageOptions: [
          {
            typeCode: "label",
            templateName: "ECOM26_84_001",
            isRequested: true,
          },
          {
            typeCode: "waybillDoc",
            templateName: "ARCH_8x4",
            isRequested: true,
          },
        ],
      },
      customerReferences: [
        {
          value: data.reference || data.orderId,
          typeCode: "CU",
        },
      ],
      // Add value-added services
      ...(this.buildValueAddedServices(data).length > 0 && {
        valueAddedServices: this.buildValueAddedServices(data),
      }),
    };
  }

  /**
   * Determine DHL product code based on shipment details
   */
  private determineProductCode(data: CreateShipmentDto): string {
    const isDomestic = data.fromAddress.country === data.toAddress.country;
    const serviceType = data.serviceType?.toUpperCase();

    // If service type is provided, try to use it
    if (serviceType) {
      return serviceType;
    }

    // Otherwise, determine based on destination
    if (isDomestic) {
      return "N"; // DHL Domestic Express (varies by country)
    } else {
      // International services
      return "P"; // Express Worldwide (default international)
    }

    // Other common DHL product codes:
    // "P" - Express Worldwide
    // "N" - Domestic Express
    // "U" - Express Worldwide (Document)
    // "Y" - Express 12:00
    // "T" - Express 10:30
    // "W" - Economy Select
  }

  /**
   * Build DHL address object
   */
  private buildDHLAddress(address: ShipmentAddress): any {
    return {
      postalCode: address.zip,
      cityName: address.city,
      countryCode: address.country,
      provinceCode: address.state,
      addressLine1: address.address1,
      ...(address.address2 && { addressLine2: address.address2 }),
    };
  }

  /**
   * Build packages array for DHL
   */
  private buildPackages(data: CreateShipmentDto): any[] {
    const numberOfPieces = data.pieces || 1;
    const packages = [];

    for (let i = 0; i < numberOfPieces; i++) {
      packages.push({
        typeCode: "2BP", // Customer Provided Box
        weight: data.weight || 1.0,
        dimensions: {
          length: data.length || 10,
          width: data.width || 10,
          height: data.height || 10,
        },
      });
    }

    return packages;
  }

  /**
   * Build value-added services
   */
  private buildValueAddedServices(data: CreateShipmentDto): any[] {
    const services = [];

    // Cash on Delivery
    if (data.codAmount && data.codAmount > 0) {
      services.push({
        serviceCode: "CC",
        value: data.codAmount,
        currency: data.codCurrency || data.currency || "USD",
      });
    }

    // Insurance
    if (data.customsValue && data.customsValue > 500) {
      services.push({
        serviceCode: "II",
        value: data.customsValue,
        currency: data.customsCurrency || data.currency || "USD",
      });
    }

    return services;
  }

  /**
   * Track a shipment with DHL
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
      const response = await this.makeRequest(
        `/shipments/${trackingNumber}/tracking`,
      );

      if (response.shipments && response.shipments.length > 0) {
        const shipment = response.shipments[0];
        const events = this.parseTrackingEvents(shipment.events || []);
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
   * Parse DHL tracking events to our format
   */
  private parseTrackingEvents(dhlEvents: any[]): any[] {
    return dhlEvents.map((event) => ({
      status: this.mapDHLStatusToInternal(
        event.typeCode || event.statusCode || "",
      ),
      description: event.description || "Status update",
      location: event.location?.address?.addressLocality || undefined,
      occurredAt: new Date(event.timestamp || new Date()),
      rawData: event,
    }));
  }

  /**
   * Map DHL status codes to internal shipment statuses
   */
  private mapDHLStatusToInternal(dhlStatus: string): string {
    const statusMap: Record<string, string> = {
      // Pre-transit
      "pre-transit": "pending",
      PU: "pending", // Shipment information received

      // Picked up
      PL: "picked_up", // Picked up
      "pickup-successful": "picked_up",

      // In transit
      "in-transit": "in_transit",
      IT: "in_transit",
      DF: "in_transit", // Departed facility
      AF: "in_transit", // Arrived at facility
      PO: "in_transit", // Processed at origin
      RW: "in_transit", // On the way

      // Out for delivery
      WC: "out_for_delivery", // With delivery courier
      "out-for-delivery": "out_for_delivery",
      OD: "out_for_delivery",

      // Delivered
      OK: "delivered", // Delivered
      delivered: "delivered",
      DD: "delivered",

      // Exceptions/Failed
      NH: "failed", // Not delivered
      exception: "failed",
      UD: "failed", // Unsuccessful delivery

      // Returned
      RT: "returned", // Return to shipper
      returned: "returned",

      // Cancelled
      cancelled: "cancelled",
      CD: "cancelled", // Cancelled
    };

    return statusMap[dhlStatus] || "in_transit";
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
        plannedPickupDateAndTime: new Date(data.pickupDate).toISOString(),
        closeTime: data.closingTime,
        location: data.location || "reception",
        locationType: "business",
        accounts: [
          {
            typeCode: "shipper",
            number: this.accountNumber,
          },
        ],
        specialInstructions: [
          {
            value: data.notes || "",
            typeCode: "TK",
          },
        ],
        remark: data.notes,
        customerDetails: {
          shipperDetails: {
            postalAddress: this.buildDHLAddress(data.pickupAddress),
            contactInformation: {
              email: data.contactEmail || "",
              phone: data.contactPhone,
              mobilePhone: data.contactPhone,
              companyName: data.pickupAddress.company || "Company",
              fullName: data.contactName,
            },
          },
        },
        shipmentDetails: [
          {
            productCode: "P",
            accounts: [
              {
                typeCode: "shipper",
                number: this.accountNumber,
              },
            ],
            content: {
              packages: [
                {
                  typeCode: "2BP",
                  weight: data.totalWeight,
                },
              ],
              isCustomsDeclarable: false,
              unitOfMeasurement: "metric",
            },
          },
        ],
      };

      const response = await this.makeRequest(
        "/pickups",
        "POST",
        pickupRequest,
      );

      return {
        pickupId:
          response.dispatchConfirmationNumber || response.confirmationNumber,
        pickupNumber: response.readyByTime,
        carrierResponse: response,
      };
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to create DHL pickup: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Cancel a pickup request
   */
  async cancelPickup(
    pickupId: string,
    comments?: string,
  ): Promise<{ success: boolean; carrierResponse: any }> {
    try {
      const cancelRequest = {
        dispatchConfirmationNumber: pickupId,
        requestorName: "System",
        reason: comments || "Cancelled by customer",
      };

      const response = await this.makeRequest(
        "/pickups/cancel",
        "POST",
        cancelRequest,
      );

      return {
        success: true,
        carrierResponse: response,
      };
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to cancel DHL pickup: ${error.message}`,
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
      const rateRequest = {
        customerDetails: {
          shipperDetails: {
            postalCode: fromAddress.zip,
            cityName: fromAddress.city,
            countryCode: fromAddress.country,
          },
          receiverDetails: {
            postalCode: toAddress.zip,
            cityName: toAddress.city,
            countryCode: toAddress.country,
          },
        },
        accounts: [
          {
            typeCode: "shipper",
            number: this.accountNumber,
          },
        ],
        productCode: this.determineProductCode({
          fromAddress,
          toAddress,
        } as CreateShipmentDto),
        plannedShippingDateAndTime: new Date().toISOString().split("T")[0],
        unitOfMeasurement: "metric",
        isCustomsDeclarable: fromAddress.country !== toAddress.country,
        monetaryAmount: [
          {
            typeCode: "declaredValue",
            value: 100,
            currency: "USD",
          },
        ],
        packages: [
          {
            typeCode: "2BP",
            weight: weight,
            dimensions: dimensions || {
              length: 10,
              width: 10,
              height: 10,
            },
          },
        ],
      };

      const response = await this.makeRequest("/rates", "POST", rateRequest);

      // Extract rate from products
      if (response.products && response.products.length > 0) {
        const product = response.products[0];
        const totalPrice = product.totalPrice?.[0];

        if (totalPrice) {
          return {
            totalAmount: totalPrice.price,
            currency: totalPrice.currency,
            carrierResponse: response,
          };
        }
      }

      throw new GlobalError("No rates available for this shipment", 404);
    } catch (error: any) {
      if (error instanceof GlobalError) throw error;
      throw new GlobalError(
        `Failed to calculate DHL rate: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Validate address with DHL
   */
  async validateAddress(address: ShipmentAddress): Promise<{
    isValid: boolean;
    suggestions?: any[];
    carrierResponse: any;
  }> {
    try {
      const validateRequest = {
        type: "delivery",
        postalCode: address.zip,
        cityName: address.city,
        countryCode: address.country,
        provinceCode: address.state,
        addressLine1: address.address1,
        ...(address.address2 && { addressLine2: address.address2 }),
      };

      const response = await this.makeRequest(
        "/address-validate",
        "POST",
        validateRequest,
      );

      return {
        isValid: response.status === "valid" || !response.warnings,
        suggestions: response.suggestions || [],
        carrierResponse: response,
      };
    } catch (error: any) {
      // DHL might not have a validation endpoint, so we'll do basic validation
      const isValid =
        address.country &&
        address.city &&
        address.zip &&
        address.address1 &&
        address.phone;

      return {
        isValid: !!isValid,
        suggestions: [],
        carrierResponse: { error: error.message },
      };
    }
  }

  // Helper methods

  private getFullName(address: ShipmentAddress): string {
    return `${address.firstName} ${address.lastName}`.trim();
  }

  private validateAddresses(
    fromAddress: ShipmentAddress,
    toAddress: ShipmentAddress,
  ): void {
    const validateAddress = (addr: ShipmentAddress, type: string) => {
      if (!addr.country || addr.country.length !== 2) {
        throw new GlobalError(
          `${type} address must have a valid 2-letter country code`,
          400,
        );
      }
      if (!addr.zip) {
        throw new GlobalError(`${type} address must have a postal code`, 400);
      }
      if (!addr.city) {
        throw new GlobalError(`${type} address must have a city`, 400);
      }
      if (!addr.phone) {
        throw new GlobalError(`${type} address must have a phone number`, 400);
      }
    };

    validateAddress(fromAddress, "From");
    validateAddress(toAddress, "To");
  }
}

/**
 * Factory function to create DHL Express provider
 */
export async function createDHLExpressProvider(
  integration: Integration,
): Promise<DHLExpressProvider> {
  if (integration.type !== "shipping_provider") {
    throw new GlobalError("Integration is not a shipping provider", 400);
  }

  if (integration.code !== "dhl") {
    throw new GlobalError("Integration is not a DHL Express provider", 400);
  }

  if (!integration.isActive) {
    throw new GlobalError("DHL Express integration is not active", 400);
  }

  return new DHLExpressProvider(integration);
}
