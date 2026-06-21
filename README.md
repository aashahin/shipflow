# ShipFlow

Unified Shipping SDK for MENA region carriers. A single API to create shipments, track packages, manage labels, handle webhooks, and more — across Aymakan, SMSA Express, Aramex, and future carriers.

Think EasyPost / Shippo, but purpose-built for Saudi Arabia and the GCC.

## Features

- **Unified types** — one `CreateShipmentInput`, one `TrackingResult`, one `WebhookEvent`, regardless of carrier
- **Tree-shakeable** — only the carriers you import are bundled
- **Auto-validation** — Zod schemas validate every `createShipment()` call before it hits the network
- **Webhook parsing** — normalize incoming carrier webhooks into a single event format
- **Zero runtime dependencies** — Bun-native `fetch`, no axios/node-fetch
- **TypeScript-first** — strict types, no `any`

## Installation

```bash
bun add shipflow
```

## Quick Start

```typescript
import { ShipFlow } from "shipflow";
import { AymakanAdapter, AymakanService } from "shipflow/carriers/aymakan";
import { SMSAExpressAdapter, SMSAService } from "shipflow/carriers/smsaexpress";
import { AramexAdapter } from "shipflow/carriers/aramex";

const client = new ShipFlow({
  adapters: [
    new AymakanAdapter({
      mode: "sandbox",
      credentials: { apiKey: process.env.AYMAKAN_API_KEY! },
    }),
    new SMSAExpressAdapter({
      mode: "sandbox",
      credentials: { apiKey: process.env.SMSA_API_KEY! },
    }),
    // Aramex auth is a ClientInfo object sent in every request body (no API key)
    new AramexAdapter({
      mode: "sandbox",
      credentials: {
        userName: process.env.ARAMEX_USERNAME!,
        password: process.env.ARAMEX_PASSWORD!,
        accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER!,
        accountPin: process.env.ARAMEX_ACCOUNT_PIN!,
        accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY!, // e.g. "RUH"
        accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE!, // e.g. "SA"
      },
    }),
  ],
});

// Create a shipment (auto-validated)
const shipment = await client.carrier("aymakan").createShipment({
  shipper: {
    name: "My Store",
    phone: "966500000000",
    line1: "123 Main St",
    city: "Riyadh",
    countryCode: "SA",
  },
  consignee: {
    name: "Customer",
    phone: "966500000001",
    line1: "456 Side St",
    city: "Jeddah",
    countryCode: "SA",
  },
  parcels: [{ weight: { value: 2, unit: "kg" }, pieces: 1 }],
  serviceType: AymakanService.ECOMMERCE,
  cod: { enabled: true, amount: 150, currency: "SAR" },
});

console.log(shipment.trackingNumber); // "AY..."
```

## API Reference

### ShipFlow Client

```typescript
const client = new ShipFlow({ adapters: [...] });

client.carrier('aymakan')           // Get a specific carrier adapter
client.carriers                      // List configured carrier names
client.hasCarrier('smsaexpress')     // Check if a carrier is configured
await client.getRatesFromAll(input)  // Fetch rates from all carriers in parallel
await client.trackAcrossCarriers(tn) // Try all carriers to find tracking info
```

### Carrier Operations

Every carrier adapter implements these **required** methods:

| Method                              | Description                               |
| ----------------------------------- | ----------------------------------------- |
| `createShipment(input)`             | Create a single shipment (auto-validated) |
| `cancelShipment(trackingNumber)`    | Cancel a shipment                         |
| `track(trackingNumber)`             | Track a single shipment                   |
| `trackMultiple(trackingNumbers)`    | Track multiple shipments                  |
| `getLabel(trackingNumber, format?)` | Get label URL or data URI                 |

Plus these **optional** methods (availability varies by carrier):

| Method                               | Aymakan | SMSA | Aramex |
| ------------------------------------ | ------- | ---- | ------ |
| `createBulkShipments(inputs)`        | ✅      | —    | ✅     |
| `cancelByReference(ref)`             | ✅      | —    | —      |
| `updateDeliveryAddress(tn, address)` | ✅      | —    | —      |
| `trackByReference(ref)`              | ✅      | ✅   | ✅     |
| `getBulkLabels(trackingNumbers)`     | ✅      | —    | —      |
| `getPickupCities()`                  | ✅      | —    | —      |
| `getTimeSlots(city, date)`           | ✅      | —    | —      |
| `createPickup(input)`                | ✅      | —    | ✅     |
| `cancelPickup(id)`                   | ✅      | —    | ✅     |
| `getPickupRequests()`                | ✅      | —    | —      |
| `getCities()`                        | ✅      | ✅   | ✅     |
| `getDropoffLocations()`              | ✅      | ✅   | ✅     |
| `createCustomerAddress(addr)`        | ✅      | —    | —      |
| `getCustomerAddresses()`             | ✅      | —    | —      |
| `updateCustomerAddress(id, addr)`    | ✅      | —    | —      |
| `deleteCustomerAddress(id)`          | ✅      | —    | —      |
| `getRates(input)`                    | —       | —    | ✅     |
| `parseWebhook(payload, options)`     | ✅      | ✅   | —      |

SMSA-specific methods:

| Method                                | Description                              |
| ------------------------------------- | ---------------------------------------- |
| `create2WayShipment(input)`           | Create forward + return shipment         |
| `sendInvoice(request)`                | Submit invoice for a shipment            |
| `validateShortAddress(shortCode)`     | Resolve Saudi national address           |
| `pushIdDetails(request)`              | Submit identity documents for KYC        |
| `parseWebhookBatch(payload, options)` | Parse batch webhook (array of shipments) |

## Carrier Support

| Feature           | Aymakan                         | SMSA Express                       | Aramex                                 |
| ----------------- | ------------------------------- | ---------------------------------- | -------------------------------------- |
| Countries         | SA, AE, BH, KW, OM, QA          | SA, AE, BH, EG, KW, OM, QA, JO     | SA, AE, BH, KW, OM, QA, JO, EG, LB, IQ |
| Service types     | 10 (ONP, SDD, RVP, EXH, ...)    | 3 (EDDL, EDEL, EDCR)               | 10 product types (OND, PPX, EPX, ...)  |
| Shipment creation | Single + Bulk                   | B2C + C2B + 2-Way                  | Single + Bulk (native batch)           |
| COD               | ✅                              | ✅ (B2C only)                      | ✅                                     |
| Cancellation      | By tracking # or reference      | C2B only                           | Pickups only (no shipment cancel API)  |
| Tracking          | Single, bulk, by reference      | Single, bulk, by reference         | Single, bulk, by reference             |
| Labels            | PDF/PNG, single + bulk          | PDF/ZPL                            | URL (HTML/PDF)                         |
| Pickups           | Full lifecycle                  | —                                  | Create + cancel                        |
| Webhooks          | ✅ (with auth verification)     | ✅ (batch, with auth verification) | — (poll via tracking)                  |
| City resolution   | Arabic ↔ English smart matching | Code-based lookup                  | Name list (FetchCities / FetchOffices) |
| Rates             | ❌                              | ❌                                 | ✅ (CalculateRate)                     |

## Aramex

Aramex is integrated via the **JSON flavor of the classic `ShippingAPI.V2` services**. A few
things make it different from the other carriers:

- **Auth is a `ClientInfo` object in every request body** (no API key / header, no token
  exchange). Pass `userName`, `password`, `accountNumber`, `accountPin`, `accountEntity` (the
  3-letter origin office, e.g. `RUH`/`DXB`/`AMM`) and `accountCountryCode`.
- **Four independent services on separate hosts** — Shipping, Tracking, RateCalculator, and
  Location. The adapter holds one HTTP client per service and routes automatically. If your
  account provisions the Location service on a different host (some WSDLs use `anfe02.aramex.com`),
  set `locationBaseUrl` on the config.
- **"Fake 200 OK" errors** — Aramex returns HTTP 200 even on logical failures, with
  `HasErrors: true` + `Notifications[]`. ShipFlow surfaces these as `APIError`, including
  per-shipment errors inside an otherwise-clean `CreateShipments` batch.
- **Rates are supported** (`getRates` → `CalculateRate`), unlike Aymakan/SMSA.
- **`cancelShipment` is unsupported** (the classic API has no shipment-cancel operation) and
  throws `UnsupportedOperationError`. Pickups can be cancelled via `cancelPickup`.
- **Labels resolve to a URL** — the `format` argument of `getLabel` can't be honored.

```typescript
import { AramexAdapter, AramexProductType } from "shipflow/carriers/aramex";

const aramex = client.carrier("aramex");

// Create a domestic COD shipment (freight prepaid, cash collected on delivery)
const shipment = await aramex.createShipment({
  shipper: {
    name: "My Store",
    company: "ShipFlow",
    phone: "966500000000",
    line1: "King Fahd Road",
    city: "Riyadh",
    countryCode: "SA",
  },
  consignee: {
    name: "Customer",
    phone: "966500000001",
    line1: "Prince Sultan Road",
    city: "Jeddah",
    countryCode: "SA",
  },
  parcels: [{ weight: { value: 1, unit: "kg" }, pieces: 1 }],
  cod: { enabled: true, amount: 150, currency: "SAR" },
});

// Quote a rate, then track
const rates = await aramex.getRates!(input);
const result = await aramex.track(shipment.trackingNumber);
```

**Product group / type & payment** — ShipFlow infers `DOM` (domestic) when shipper and consignee
share a country, else `EXP`, and picks a sensible default product type (`OND` for domestic, `EPX`
for express). Override with `serviceType` (a valid Aramex code) or
`options.metadata.productGroup` / `productType`.

The freight **`PaymentType`** — who pays the *shipping cost* — defaults to `P` and is independent
of COD: enabling COD adds the `CODS` service and the cash amount to collect from the consignee, but
does **not** charge them freight. Override the freight payer with `options.metadata.paymentType`:

| Value | Freight billed to | When to use |
| ----- | ----------------- | ----------- |
| `"P"` _(default)_ | Shipper's Aramex account (prepaid) | Standard KSA/GCC e-commerce — merchant pays shipping, even with COD |
| `"C"` | Consignee, collected at delivery | Customer pays shipping on top of any COD |
| `"3"` | A third-party account | Freight billed to someone other than shipper/consignee |

```typescript
// Default: COD shipment with prepaid freight (PaymentType "P")
await aramex.createShipment({
  ...input,
  cod: { enabled: true, amount: 150, currency: "SAR" }, // freight stays "P"
});

// Override: charge the customer freight at the door (PaymentType "C")
await aramex.createShipment({
  ...input,
  cod: { enabled: true, amount: 150, currency: "SAR" },
  options: { metadata: { paymentType: "C" } },
});

// Override: bill freight to a third party (PaymentType "3")
await aramex.createShipment({
  ...input,
  options: { metadata: { paymentType: "3" } },
});
```

> Aramex does not push webhooks — poll `track()` / `trackMultiple()` for status updates.
> Tracking `UpdateCode`s vary by region and aren't fully published, so ShipFlow maps known codes
> and falls back to a description-keyword heuristic (then `"unknown"`) — an unmapped code never
> breaks tracking.

## Webhook Handling

### Aymakan

Aymakan sends a single shipment status update per webhook call:

```typescript
const event = client.carrier("aymakan").parseWebhook!(requestBody, {
  headers: req.headers,
  config: {
    authHeader: "X-Aymakan-Auth",
    authValue: process.env.AYMAKAN_WEBHOOK_SECRET!,
  },
});

console.log(event.trackingNumber); // "AY..."
console.log(event.status); // "delivered"
console.log(event.statusCode); // "AY-0005"
```

### SMSA Express

SMSA sends an **array** of shipment updates per webhook call:

```typescript
const adapter = client.carrier("smsaexpress") as SMSAExpressAdapter;

// Parse all shipments in the batch
const events = adapter.parseWebhookBatch(requestBody, {
  queryParams: { key: req.query.key },
  config: {
    authQueryParam: "key",
    authQueryValue: process.env.SMSA_WEBHOOK_KEY!,
  },
});

for (const event of events) {
  console.log(event.trackingNumber); // "231200021000"
  console.log(event.status); // "delivered" | "out_for_delivery" | ...
}

// Or parse only the first item (CarrierAdapter interface compatible)
const single = adapter.parseWebhook(requestBody);
```

### WebhookEvent Shape

```typescript
interface WebhookEvent {
  carrier: string;
  eventType: "status_update" | "weight_update";
  trackingNumber: string;
  reference?: string;
  status: ShipmentStatus;
  statusCode: string;
  statusLabel: string;
  reasonCode?: string; // Aymakan: reason for failed delivery
  reasonLabel?: string;
  timestamp: Date;
  raw: unknown; // Original carrier payload
}
```

## Input Validation

All `createShipment()` calls are **automatically validated** using Zod schemas before hitting the carrier API. Invalid input throws a `ValidationError` with field-level details:

```typescript
try {
  await client.carrier("aymakan").createShipment({
    shipper: { name: "", phone: "", line1: "", city: "", countryCode: "X" },
    consignee: { name: "", phone: "", line1: "", city: "", countryCode: "" },
    parcels: [],
    serviceType: "",
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.issues);
    // [
    //   { path: "shipper.name", message: "Name is required" },
    //   { path: "shipper.countryCode", message: "Country code must be ISO 3166-1 alpha-2 (2 characters)" },
    //   { path: "parcels", message: "At least one parcel is required" },
    //   ...
    // ]
  }
}
```

You can also validate manually before calling the API:

```typescript
import { validateCreateShipmentInput, validatePickupRequest } from "shipflow";

validateCreateShipmentInput(input); // throws ValidationError or returns validated input
validatePickupRequest(pickupInput); // same pattern
```

Exported Zod schemas for advanced use (custom refinements, partial validation, etc.):

```typescript
import {
  AddressSchema,
  ParcelSchema,
  CreateShipmentInputSchema,
  PickupRequestSchema,
} from "shipflow";
```

## Error Handling

All errors extend `ShipFlowError` for easy catch-all handling:

```typescript
import {
  ShipFlowError,
  NetworkError,
  APIError,
  ValidationError,
  AuthenticationError,
  WebhookVerificationError,
  UnsupportedOperationError,
} from "shipflow";

try {
  await client.carrier("aymakan").createShipment(input);
} catch (error) {
  if (error instanceof ValidationError) {
    // Bad input — check error.issues
  } else if (error instanceof AuthenticationError) {
    // Invalid API key
  } else if (error instanceof APIError) {
    // Carrier returned an error — check error.statusCode, error.errors
  } else if (error instanceof NetworkError) {
    // Timeout, DNS, connection refused
  }
}
```

## Custom Adapters

Implement the `CarrierAdapter` interface or extend `BaseCarrierAdapter`:

```typescript
import { BaseCarrierAdapter } from "shipflow";
import type { CreateShipmentInput, Shipment, TrackingResult } from "shipflow";

class MyCarrierAdapter extends BaseCarrierAdapter {
  readonly name = "mycarrier";
  readonly supportedCountries = ["SA"];

  protected getBaseUrl() {
    return this.config.mode === "production"
      ? "https://api.mycarrier.com"
      : "https://sandbox.mycarrier.com";
  }

  protected async executeCreateShipment(
    input: CreateShipmentInput,
  ): Promise<Shipment> {
    // Your implementation — input is already validated by BaseCarrierAdapter
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    /* ... */
  }
  async track(trackingNumber: string): Promise<TrackingResult> {
    /* ... */
  }
  async trackMultiple(trackingNumbers: string[]): Promise<TrackingResult[]> {
    /* ... */
  }
  async getLabel(trackingNumber: string): Promise<string> {
    /* ... */
  }
}
```

## Development

```bash
bun install
bun test           # Run all tests
bun test --watch   # Watch mode
bun run typecheck  # TypeScript check
```

## License

MIT
