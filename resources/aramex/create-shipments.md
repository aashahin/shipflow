# CreateShipments

`POST <Shipping>/json/CreateShipments` — create one or more shipments.

`createShipment` maps one `CreateShipmentInput` to a single-element `Shipments`
array (`mapCreateShipmentRequest`). `createBulkShipments` maps N inputs to an
N-element `Shipments` array against the same endpoint (Aramex is natively batch)
and returns one `Shipment` per input in request order. Bulk fails loud: if any
shipment in the batch errors, an `APIError` is thrown whose `raw` holds the full
response so already-created AWBs stay recoverable.

## Request

```json
{
  "ClientInfo": { "...": "see api-reference.md" },
  "Transaction": {},
  "LabelInfo": { "ReportID": 9201, "ReportType": "URL" },
  "Shipments": [
    {
      "Reference1": "ORDER-123",
      "Shipper": {
        "AccountNumber": "12345",
        "PartyAddress": {
          "Line1": "King Fahd Road",
          "Line3": "Al Olaya",
          "City": "Riyadh",
          "PostCode": "12211",
          "CountryCode": "SA"
        },
        "Contact": {
          "PersonName": "Test Store",
          "CompanyName": "ShipFlow",
          "PhoneNumber1": "966501234567",
          "CellPhone": "966501234567",
          "EmailAddress": "store@test.com"
        }
      },
      "Consignee": { "PartyAddress": { "...": "" }, "Contact": { "...": "" } },
      "ShippingDateTime": "/Date(1718800000000)/",
      "DueDate": "/Date(1718886400000)/",
      "Details": {
        "ActualWeight": { "Value": 1, "Unit": "Kg" },
        "NumberOfPieces": 1,
        "DescriptionOfGoods": "Goods",
        "GoodsOriginCountry": "SA",
        "ProductGroup": "DOM",
        "ProductType": "OND",
        "PaymentType": "P",
        "CashOnDeliveryAmount": { "Value": 150, "CurrencyCode": "SAR" },
        "Services": "CODS"
      }
    }
  ]
}
```

`LabelInfo.ReportID` `9201` with `ReportType: "URL"` requests a label returned as a URL.

## Response

```json
{
  "HasErrors": false,
  "Notifications": [],
  "Shipments": [
    {
      "ID": "47384200001",
      "HasErrors": false,
      "Notifications": [],
      "ShipmentLabel": { "LabelURL": "https://www.aramex.com/labels/47384200001.pdf" }
    }
  ]
}
```

- `ID` is the AWB / tracking number → `Shipment.trackingNumber`.
- `ShipmentLabel.LabelURL` → `Shipment.labelUrl` / `pdfLabelUrl`.
- A clean envelope (`HasErrors: false`) can still contain a failed shipment
  (`Shipments[0].HasErrors: true`) — ShipFlow throws `APIError` in that case.
- Aramex returns no status on create, so `Shipment.status` is always `"created"`.
