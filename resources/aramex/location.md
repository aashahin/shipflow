# FetchCities / FetchOffices

Both are on the **Location** service.

## FetchCities

`POST <Location>/json/FetchCities`

```json
{ "ClientInfo": { "...": "" }, "Transaction": {}, "CountryCode": "SA" }
```

Response — a **flat array of English city-name strings** (no Arabic name, no code):

```json
{ "HasErrors": false, "Notifications": [], "Cities": ["Riyadh", "Jeddah", "Dammam"] }
```

`getCities(countryCode?)` maps each string to `{ nameEn }`. The country defaults to the account's
`accountCountryCode`. Because Aramex returns only names, `City.nameAr` and `City.code` are
`undefined`.

## FetchOffices

`POST <Location>/json/FetchOffices`

```json
{ "ClientInfo": { "...": "" }, "Transaction": {}, "CountryCode": "SA" }
```

Response:

```json
{
  "HasErrors": false,
  "Notifications": [],
  "Offices": [
    {
      "EntityCode": "RUH",
      "EntityName": "Riyadh Main Office",
      "Address": {
        "Line1": "Exit 18, Eastern Ring Road",
        "City": "Riyadh",
        "CountryCode": "SA",
        "Latitude": 24.7136,
        "Longitude": 46.6753
      }
    }
  ]
}
```

`getDropoffLocations(countryCode?)` maps each office to a unified `Location`
(`id = EntityCode`, name, joined address lines, city, lat/lng).
