# PrintLabel

`POST <Shipping>/json/PrintLabel` — get the label for an existing shipment.

## Request

```json
{
  "ClientInfo": { "...": "" },
  "Transaction": {},
  "ShipmentNumber": "47384200001",
  "LabelInfo": { "ReportID": 9201, "ReportType": "URL" }
}
```

## Response

```json
{
  "HasErrors": false,
  "Notifications": [],
  "ShipmentNumber": "47384200001",
  "ShipmentLabel": { "LabelURL": "https://www.aramex.com/labels/47384200001.pdf" }
}
```

ShipFlow's `getLabel()` returns `ShipmentLabel.LabelURL`.

> **Format note:** PrintLabel returns the label as a **URL** (or, with
> `ReportType: "RPT"`, base64 in `LabelFileContents`). The `format` argument of
> `getLabel(trackingNumber, format)` (`PDF` / `ZPL` / `PNG`) cannot be honored — the call
> always resolves to a URL.
