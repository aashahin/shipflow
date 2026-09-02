# Aramex JSON Shipping Services API v2 — Reference

ShipFlow integrates Aramex via the **JSON flavor of the classic SOAP `ShippingAPI.V2`
services**. Every operation is an HTTP `POST` to `<service-base>.svc/json/<Operation>` with a
JSON body. Authentication is a `ClientInfo` object included in **every** request body (there is
no auth header and no token exchange).

## Services & base URLs

There are four independent services, each on its own base URL. ShipFlow's `AramexAdapter` holds
one `HttpClient` per service.

| Service | Sandbox (`mode: "sandbox"`) | Production (`mode: "production"`) |
|---|---|---|
| Shipping | `https://ws.dev.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc` | `https://ws.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc` |
| Tracking | `https://ws.dev.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc` | `https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc` |
| RateCalculator | `https://ws.dev.aramex.net/ShippingAPI.V2/RateCalculator/Service_1_0.svc` | `https://ws.aramex.net/ShippingAPI.V2/RateCalculator/Service_1_0.svc` |
| Location | `https://ws.dev.aramex.net/ShippingAPI.V2/Location/Service_1_0.svc` | `https://ws.aramex.net/ShippingAPI.V2/Location/Service_1_0.svc` |

> **Location host caveat:** some live WSDLs publish the Location service under
> `anfe02.aramex.com` instead of `ws.aramex.net`. If your account is provisioned there, set
> `locationBaseUrl` on the adapter config.

Operations used by ShipFlow:

- **Shipping:** `/json/CreateShipments`, `/json/PrintLabel`, `/json/CreatePickup`, `/json/CancelPickup`
- **Tracking:** `/json/TrackShipments`
- **RateCalculator:** `/json/CalculateRate`
- **Location:** `/json/FetchCities`, `/json/FetchOffices`

## ClientInfo (auth)

Sent in the body of every request:

```json
{
  "UserName": "user@example.com",
  "Password": "********",
  "Version": "v1.0",
  "AccountNumber": "12345",
  "AccountPin": "1234",
  "AccountEntity": "RUH",
  "AccountCountryCode": "SA",
  "Source": 24
}
```

`AccountEntity` is the three-letter origin office (e.g. `RUH`, `DXB`, `AMM`) and is tied to the
shipping origin. `Source` (default `24`) and `Version` (default `v1.0`) are configurable on the
adapter.

ShipFlow config → ClientInfo mapping lives in `buildClientInfo` (`src/carriers/aramex/mappers.ts`).

## Request serialization — WCF required members

Aramex's services are WCF `DataContract` types deserialized with
`DataContractJsonSerializer`, which **rejects requests that omit members marked
`IsRequired`** with `HTTP 400` and `"required data members '…' were not found"`.
Several members that look optional are required and must be present (an **empty
string is accepted**, a missing key is not). Confirmed against the live API:

| Contract | Required members ShipFlow always sends |
|---|---|
| `Transaction` | `Reference1`–`Reference5` (empty strings; never `{}`) |
| `Address` (`PartyAddress`/Origin/Destination) | `Line1`, `Line2`, `Line3`, `City`, `PostCode`, `CountryCode` |
| `Contact` | `PersonName`, `CompanyName`, `PhoneNumber1`, `PhoneNumber1Ext`, `PhoneNumber2`, `CellPhone`, `EmailAddress`, `Title`, `Type`, `Department` |

Nullable members (`Dimensions`, `ChargeableWeight`, `CashOnDeliveryAmount`,
`CustomsValueAmount`, `InsuranceAmount`) may be sent as `null`. Coordinates
(`Longitude`/`Latitude`) are optional and omitted when unset (so `0,0` is never
sent as a real location).

## Error model — "Fake 200 OK"

Aramex returns **HTTP 200** even for logical failures. The body carries:

```json
{ "HasErrors": true, "Notifications": [{ "Code": "ERR01", "Message": "..." }] }
```

ShipFlow surfaces this through the shared `HttpClient` `errorExtractor` hook (passed on every
Aramex call), which raises an `APIError` whenever `HasErrors === true`, with the joined
`Notifications[].Message` as the error message.

`CreateShipments` additionally reports **per-shipment** errors: the envelope may have
`HasErrors: false` while an individual `Shipments[i].HasErrors` is `true`. The adapter checks both.

## Appendices

### ProductGroup
| Code | Meaning |
|---|---|
| `DOM` | Domestic |
| `EXP` | Express / international |

ShipFlow infers `DOM` when shipper and consignee share a country, else `EXP`. Override via
`serviceType` (a valid product-type code) or `options.metadata.productGroup` / `productType`.

### ProductType (Appendix A)
`OND` (domestic), `PDX`, `PPX`, `PLX`, `DDX`, `DPX`, `GDX`, `GPX`, `EPX` (economy express),
`RTN` (return). Defaults: `DOM → OND`, `EXP → EPX`.

### PaymentType (Appendix B)
| Code | Meaning |
|---|---|
| `P` | Prepaid |
| `C` | Collect (used for COD) |
| `3` | Third party |

`PaymentType` is the **freight** payer and is independent of COD: ShipFlow defaults
it to `P` (prepaid, billed to the shipper's account) — enabling COD does **not**
change it, since COD only adds the `CODS` service + `CashOnDeliveryAmount` to collect
the goods value from the consignee. This matches KSA/GCC e-commerce, where the
merchant prepays freight and Aramex collects cash on delivery. Override via
`options.metadata.paymentType` (e.g. `"C"` to charge freight to the consignee).
When set to `"3"`, the authenticated billing account is sent in the shipment's
required `ThirdParty` party while `Shipper` remains the physical pickup party.

### Special services
Joined comma-separated into `Details.Services`: `CODS` (cash on delivery), `INSR` (insurance).
`INSR` is only requested when a `declaredValue` is supplied — it sets
`Details.InsuranceAmount` to that value. `isInsured` without a declared value is
ignored, since Aramex rejects `INSR` with a null `InsuranceAmount`.

## Dates

Outbound `ShippingDateTime` / `DueDate` and inbound `UpdateDateTime` use the WCF format
`/Date(<unix-ms>[±hhmm])/`. ShipFlow emits this format and parses it back via `parseAramexDate`.

## Sources
- Aramex Shipping Services API manual (aramex.com/docs)
- Aramex Shipments Tracking API manual (aramex.com)
- Reference SDKs: Moustafa22/Laravel-Aramex-SDK, aramex-api-wrapper (npm)
