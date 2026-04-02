/**
 * DHL Express Integration Example
 *
 * This file demonstrates how to use the DHL Express provider
 * with example credentials and shipment data.
 */

import type { Integration } from "@/db/prisma";
import { createDHLExpressProvider } from "../providers/dhl.provider";

/**
 * Example DHL Express Integration Configuration
 *
 * To use DHL Express, you need:
 * 1. API Key (from DHL Developer Portal)
 * 2. API Secret (from DHL Developer Portal)
 * 3. Account Number (your DHL Express account number)
 *
 * Sign up at: https://developer.dhl.com/
 */
const exampleIntegration: Integration = {
  id: "dhl-integration-id",
  code: "dhl",
  type: "shipping_provider",
  name: "DHL Express",
  isActive: true,
  settings: {
    // Test credentials (replace with actual credentials)
    apiKey: "your_dhl_api_key",
    apiSecret: "your_dhl_api_secret",
    accountNumber: "123456789",
    testMode: true, // Use test mode for development
  },
  tenantId: "tenant-id",
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Example 1: Create a domestic shipment
 */
async function exampleCreateDomesticShipment() {
  const dhlProvider = await createDHLExpressProvider(exampleIntegration);

  const shipmentData = {
    orderId: "ORD-12345",
    carrierName: "DHL Express",
    serviceType: "N", // Domestic Express
    fromAddress: {
      firstName: "John",
      lastName: "Sender",
      company: "Sender Corp",
      address1: "123 Sender Street",
      address2: "Suite 100",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      phone: "+1234567890",
      email: "sender@example.com",
    },
    toAddress: {
      firstName: "Jane",
      lastName: "Receiver",
      company: "Receiver Inc",
      address1: "456 Receiver Avenue",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
      country: "US",
      phone: "+1987654321",
      email: "receiver@example.com",
    },
    weight: 2.5, // kg
    length: 30, // cm
    width: 20, // cm
    height: 15, // cm
    pieces: 1,
    description: "Documents and samples",
    reference: "REF-12345",
    notes: "Handle with care",
  };

  try {
    const result = await dhlProvider.createShipment(shipmentData);

    console.log("Shipment created successfully!");
    console.log("Shipment ID:", result.shipmentId);
    console.log("Tracking Number:", result.trackingNumber);
    console.log("Label URL:", result.labelUrl);

    return result;
  } catch (error) {
    console.error("Failed to create shipment:", error);
    throw error;
  }
}

/**
 * Example 2: Create an international shipment with customs
 */
async function exampleCreateInternationalShipment() {
  const dhlProvider = await createDHLExpressProvider(exampleIntegration);

  const shipmentData = {
    orderId: "ORD-67890",
    carrierName: "DHL Express",
    serviceType: "P", // Express Worldwide
    fromAddress: {
      firstName: "John",
      lastName: "Exporter",
      company: "Export Company",
      address1: "100 Export Plaza",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      phone: "+1234567890",
      email: "export@example.com",
    },
    toAddress: {
      firstName: "Maria",
      lastName: "Importer",
      company: "Import GmbH",
      address1: "200 Import Strasse",
      city: "Berlin",
      state: "BE",
      zip: "10115",
      country: "DE",
      phone: "+491234567890",
      email: "import@example.de",
    },
    weight: 5.0,
    length: 40,
    width: 30,
    height: 20,
    pieces: 2,
    description: "Electronic components",
    reference: "INTL-67890",
    dutiable: true,
    customsValue: 500.0,
    customsCurrency: "USD",
    notes: "Commercial shipment",
  };

  try {
    const result = await dhlProvider.createShipment(shipmentData);

    console.log("International shipment created!");
    console.log("Tracking Number:", result.trackingNumber);

    return result;
  } catch (error) {
    console.error("Failed to create international shipment:", error);
    throw error;
  }
}

/**
 * Example 3: Track a shipment
 */
async function exampleTrackShipment() {
  const dhlProvider = await createDHLExpressProvider(exampleIntegration);

  const trackingNumber = "1234567890";

  try {
    const tracking = await dhlProvider.trackShipment(trackingNumber);

    console.log("Shipment Status:", tracking.status);
    console.log("\nTracking Events:");
    tracking.events.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.status}`);
      console.log(`   Description: ${event.description}`);
      console.log(`   Location: ${event.location || "N/A"}`);
      console.log(`   Time: ${event.occurredAt}`);
    });

    return tracking;
  } catch (error) {
    console.error("Failed to track shipment:", error);
    throw error;
  }
}

/**
 * Example 4: Schedule a pickup
 */
async function exampleCreatePickup() {
  const dhlProvider = await createDHLExpressProvider(exampleIntegration);

  const pickupData = {
    carrierName: "DHL Express",
    pickupAddress: {
      firstName: "John",
      lastName: "Sender",
      company: "My Company",
      address1: "123 Business Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      phone: "+1234567890",
      email: "pickup@example.com",
    },
    contactName: "John Sender",
    contactPhone: "+1234567890",
    contactEmail: "pickup@example.com",
    pickupDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    readyTime: "09:00",
    closingTime: "17:00",
    location: "reception",
    totalWeight: 10.0,
    totalPieces: 3,
    reference: "PICKUP-123",
    notes: "Call when arrived",
  };

  try {
    const result = await dhlProvider.createPickup(pickupData);

    console.log("Pickup scheduled successfully!");
    console.log("Pickup ID:", result.pickupId);
    console.log("Pickup Number:", result.pickupNumber);

    return result;
  } catch (error) {
    console.error("Failed to schedule pickup:", error);
    throw error;
  }
}

/**
 * Example 5: Cancel a pickup
 */
async function exampleCancelPickup() {
  const dhlProvider = await createDHLExpressProvider(exampleIntegration);

  const pickupId = "pickup-confirmation-number";
  const comments = "Plans changed, will ship later";

  try {
    const result = await dhlProvider.cancelPickup(pickupId, comments);

    console.log("Pickup cancelled:", result.success);

    return result;
  } catch (error) {
    console.error("Failed to cancel pickup:", error);
    throw error;
  }
}

/**
 * Example 6: Calculate shipping rate
 */
async function exampleCalculateRate() {
  const dhlProvider = await createDHLExpressProvider(exampleIntegration);

  const fromAddress = {
    firstName: "John",
    lastName: "Sender",
    address1: "123 Street",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "US",
    phone: "+1234567890",
  };

  const toAddress = {
    firstName: "Jane",
    lastName: "Receiver",
    address1: "456 Avenue",
    city: "Los Angeles",
    state: "CA",
    zip: "90001",
    country: "US",
    phone: "+1987654321",
  };

  try {
    const rate = await dhlProvider.calculateRate(
      fromAddress,
      toAddress,
      2.5, // weight in kg
      { length: 30, width: 20, height: 15 }, // dimensions in cm
    );

    console.log("Shipping Rate:", rate.totalAmount, rate.currency);

    return rate;
  } catch (error) {
    console.error("Failed to calculate rate:", error);
    throw error;
  }
}

/**
 * Example 7: Validate an address
 */
async function exampleValidateAddress() {
  const dhlProvider = await createDHLExpressProvider(exampleIntegration);

  const address = {
    firstName: "John",
    lastName: "Doe",
    address1: "123 Main Street",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "US",
    phone: "+1234567890",
  };

  try {
    const validation = await dhlProvider.validateAddress(address);

    console.log("Address Valid:", validation.isValid);
    if (validation.suggestions && validation.suggestions.length > 0) {
      console.log("Suggestions:", validation.suggestions);
    }

    return validation;
  } catch (error) {
    console.error("Failed to validate address:", error);
    throw error;
  }
}

/**
 * Example 8: Create shipment with Cash on Delivery (COD)
 */
async function exampleCreateCODShipment() {
  const dhlProvider = await createDHLExpressProvider(exampleIntegration);

  const shipmentData = {
    orderId: "ORD-COD-123",
    carrierName: "DHL Express",
    fromAddress: {
      firstName: "Seller",
      lastName: "Shop",
      company: "E-commerce Store",
      address1: "789 Merchant Road",
      city: "Dubai",
      state: "DU",
      zip: "00000",
      country: "AE",
      phone: "+971501234567",
      email: "seller@shop.com",
    },
    toAddress: {
      firstName: "Buyer",
      lastName: "Customer",
      address1: "321 Customer Street",
      city: "Abu Dhabi",
      state: "AZ",
      zip: "00000",
      country: "AE",
      phone: "+971509876543",
      email: "buyer@example.com",
    },
    weight: 1.5,
    length: 25,
    width: 20,
    height: 10,
    pieces: 1,
    description: "E-commerce order",
    codAmount: 250.0, // COD amount
    codCurrency: "AED",
    reference: "COD-ORDER-123",
  };

  try {
    const result = await dhlProvider.createShipment(shipmentData);

    console.log("COD Shipment created!");
    console.log("Tracking Number:", result.trackingNumber);
    console.log("COD Amount: 250.00 AED");

    return result;
  } catch (error) {
    console.error("Failed to create COD shipment:", error);
    throw error;
  }
}

/**
 * DHL Express Service Types
 *
 * Domestic Services:
 * - "N" - Domestic Express
 *
 * International Services:
 * - "P" - Express Worldwide (default)
 * - "U" - Express Worldwide (Documents)
 * - "Y" - Express 12:00
 * - "T" - Express 10:30
 * - "W" - Economy Select
 * - "1" - Domestic Economy Select
 * - "G" - Domestic Economy Select (Non-Doc)
 * - "B" - Breakbulk Express
 * - "C" - Medical Express
 * - "D" - Express Easy
 * - "E" - Express Easy (Documents)
 * - "F" - Freight Worldwide
 * - "H" - Economy Select (Non-Doc)
 * - "J" - Jumbo Box
 * - "K" - Express 9:00
 * - "L" - Express 10:30 (Documents)
 * - "M" - Express 10:30 (Non-Doc)
 * - "O" - Others
 * - "Q" - Medical Express (Documents)
 * - "R" - Globalmail Business
 * - "S" - Same Day
 * - "V" - Europack
 * - "X" - Express Envelope
 */

// Export examples for use in other files
export {
  exampleCalculateRate,
  exampleCancelPickup,
  exampleCreateCODShipment,
  exampleCreateDomesticShipment,
  exampleCreateInternationalShipment,
  exampleCreatePickup,
  exampleTrackShipment,
  exampleValidateAddress,
};

// Run examples (uncomment to test)
// exampleCreateDomesticShipment();
// exampleTrackShipment();
// exampleCalculateRate();
