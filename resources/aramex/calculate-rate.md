# CalculateRate

`POST <RateCalculator>/json/CalculateRate` — quote the price for a shipment.

## Request

```json
{
  "ClientInfo": { "...": "" },
  "Transaction": {},
  "OriginAddress": { "City": "Riyadh", "CountryCode": "SA" },
  "DestinationAddress": { "City": "Jeddah", "CountryCode": "SA" },
  "ShipmentDetails": {
    "ActualWeight": { "Value": 2, "Unit": "Kg" },
    "NumberOfPieces": 1,
    "ProductGroup": "DOM",
    "ProductType": "OND",
    "PaymentType": "P"
  },
  "PreferredCurrencyCode": "SAR"
}
```

ShipFlow reuses the same `ShipmentDetails` builder as `CreateShipments`, so ProductGroup/Type and
COD are derived the same way.

## Response

```json
{
  "HasErrors": false,
  "Notifications": [],
  "TotalAmount": { "Value": 35.5, "CurrencyCode": "SAR" },
  "RateDetails": { "Amount": 30, "TaxAmount": 5.5 }
}
```

`getRates()` returns a single-element `Rate[]`: `amount = TotalAmount.Value`,
`currency = TotalAmount.CurrencyCode`. A clean envelope with no `TotalAmount`
(Aramex couldn't price the route) raises an `APIError` rather than returning a
misleading `0` rate.
