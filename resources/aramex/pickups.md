# CreatePickup / CancelPickup

Both are on the **Shipping** service.

## CreatePickup

`POST <Shipping>/json/CreatePickup`

```json
{
  "ClientInfo": { "...": "" },
  "Transaction": {},
  "Pickup": {
    "PickupAddress": { "Line1": "King Fahd Road", "City": "Riyadh", "CountryCode": "SA" },
    "PickupContact": {
      "PersonName": "Store Manager",
      "CompanyName": "ShipFlow Co",
      "PhoneNumber1": "966500000000",
      "CellPhone": "966500000000"
    },
    "PickupLocation": "Reception",
    "PickupDate": "/Date(1719792000000)/",
    "ReadyTime": "/Date(1719824400000)/",
    "LastPickupTime": "/Date(1719853200000)/",
    "ClosingTime": "/Date(1719853200000)/",
    "Status": "Ready",
    "PickupItems": {
      "PickupItemDetail": [
        {
          "ProductGroup": "DOM",
          "ProductType": "OND",
          "Payment": "P",
          "NumberOfShipments": 2,
          "NumberOfPieces": 2,
          "ShipmentWeight": { "Value": 1, "Unit": "Kg" }
        }
      ]
    }
  }
}
```

Response:

```json
{
  "HasErrors": false,
  "Notifications": [],
  "ProcessedPickup": { "ID": "1", "GUID": "abc-guid-123" }
}
```

ShipFlow's `createPickup()` validates the `PickupRequest`, builds the `Pickup` object
(`mapPickupRequest`), and returns a unified `Pickup` whose `id` is the **GUID** (needed to cancel).

> ShipFlow maps the single free-text `address` and `city` from `PickupRequest` into
> `PickupAddress`; `timeSlot` is recorded in `Comments`, and ready/closing default to 09:00–17:00
> on the pickup date. Like all Aramex addresses, `PickupAddress` carries the WCF-required
> `Line2`, `Line3` and `PostCode` members (empty when unset) so deserialization doesn't fail.

## CancelPickup

`POST <Shipping>/json/CancelPickup`

```json
{ "ClientInfo": { "...": "" }, "Transaction": {}, "PickupGUID": "abc-guid-123" }
```

`cancelPickup(pickupId)` sends the GUID and returns `true` when `HasErrors === false`.
