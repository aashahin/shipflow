# TrackShipments

`POST <Tracking>/json/TrackShipments` — track one or more waybills (or references).

## Request

```json
{
  "ClientInfo": { "...": "" },
  "Transaction": {},
  "Shipments": ["47384200001"],
  "GetLastTrackingUpdateOnly": false
}
```

ShipFlow sends references through the same `Shipments` array for `trackByReference`. Whether
reference tracking is honored depends on account configuration; otherwise the value comes back in
`NonExistingWaybills`.

## Response

The `TrackingResults` field is a `Dictionary<string, TrackingResult[]>`. The WCF JSON serializer
renders it as an **array of `{ Key, Value }` pairs**, but some gateways return a **plain object
map**. ShipFlow's `normalizeTrackingResults` accepts both.

```json
{
  "HasErrors": false,
  "Notifications": [],
  "TrackingResults": [
    {
      "Key": "47384200001",
      "Value": [
        {
          "WaybillNumber": "47384200001",
          "UpdateCode": "SH014",
          "UpdateDescription": "Shipment delivered",
          "UpdateDateTime": "/Date(1718900000000+0300)/",
          "UpdateLocation": "Riyadh",
          "GrossWeight": "1.5"
        }
      ]
    }
  ],
  "NonExistingWaybills": []
}
```

Each `Value[]` entry → a `TrackingEvent`. Events are sorted newest-first; the latest event's
status becomes the overall `TrackingResult.status`.

## UpdateCode → status

Aramex does **not** publish a stable, complete `UpdateCode` list, and codes vary by region. The
`AramexStatusCodes` table (`src/carriers/aramex/services.ts`) is a best-effort starter with most
entries marked `VERIFY`. When a code isn't mapped, ShipFlow falls back to a keyword heuristic on
`UpdateDescription` (`statusFromDescription`) and finally `"unknown"`, so an unmapped code never
breaks tracking. Confirm specific codes against live tracking data before relying on them.
