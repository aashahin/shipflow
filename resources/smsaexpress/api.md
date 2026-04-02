# SMSA Express API Documentation

---

## Table of Contents

1. [Create New B2C Shipment](#1-create-new-b2c-shipment)
2. [Query B2C Shipment By AWB](#2-query-b2c-shipment-by-awb)
3. [Create C2B (Pickup Return) Shipment](#3-create-c2b-pickup-return-shipment)
4. [Query C2B (Pickup Return) Shipment](#4-query-c2b-pickup-return-shipment)
5. [Get Country / Currency Lookup](#5-get-country--currency-lookup)
6. [Get SMSA Offices Lookup](#6-get-smsa-offices-lookup)
7. [Send Shipment Invoice](#7-send-shipment-invoice)
8. [Cancel Reverse Pickup Shipments](#8-cancel-reverse-pickup-shipments)
9. [Track Bulk Shipments](#9-track-bulk-shipments)
10. [Track Single Shipment](#10-track-single-shipment)
11. [Get Status Lookup](#11-get-status-lookup)
12. [New 2-Way Shipment](#12-new-2-way-shipment)
13. [Cities Lookup](#13-cities-lookup)
14. [Track Single Shipment By Reference](#14-track-single-shipment-by-reference)
15. [Validate Short Address](#15-validate-short-address)
16. [Push ID Details](#16-push-id-details)

---

## 1. Create New B2C Shipment

> Create a new B2C Shipment (e-commerce)

**Endpoint:**
```http
POST /api/shipment/b2c/new HTTP/1.1
Host: {environment_url}
apikey: {API_KEY}
Content-Type: application/json
```

### Request Parameters

| Parameter Name     | Data Type               | Mandatory | Sample                    | Notes                                              |
|--------------------|-------------------------|-----------|---------------------------|----------------------------------------------------|
| CODAmount          | Float                   | M         | 100                       | In destination currency                            |
| ConsigneeAddress   | ShipmentAddress Object  | M         |                           |                                                    |
| ContentDescription | String                  | M         | Shipment Description and content |                                             |
| DeclaredValue      | Float                   | M         | 100                       |                                                    |
| DutyPaid           | Boolean                 | O         | false                     |                                                    |
| OrderNumber        | String                  | M         | order221-212              |                                                    |
| Parcels            | Int                     | M         | 1                         | Count of boxes per shipment                        |
| ServiceCode        | String                  | O         | EDDL                      | List of SMSA Service Types available via lookup    |
| ShipDate           | DateTime                | M         | 2021-01-01T08:00:00       |                                                    |
| ShipmentCurrency   | String                  | M         | SAR                       | Declared Value Currency (ISO Code)                 |
| ShipperAddress     | ShipmentAddress Object  | M         |                           |                                                    |
| SMSARetailID       | String                  | O         | 1                         | List of SMSA Offices available via lookup          |
| VatPaid            | Boolean                 | O         | true                      |                                                    |
| WaybillType        | String                  | O         | PDF                       | PDF or ZPL                                         |
| Weight             | Float                   | M         | 0.5                       |                                                    |
| WeightUnit         | String                  | M         | KG or LB                  | ISO weight measure unit                            |

### ShipmentAddress Object

| Parameter Name      | Data Type | Mandatory | Sample                           | Notes                                              |
|---------------------|-----------|-----------|----------------------------------|----------------------------------------------------|
| AddressLine1        | String    | M         | Shipper Consignee Address Line 1 | Length between 10–100 characters                   |
| AddressLine2        | String    | O         | Shipper Consignee Address Line 2 | Length between 0–100 characters                    |
| City                | String    | M         | Riyadh                           | Length between 3–50 characters                     |
| ConsigneeID         | String    | O         | 1234567890                       | Valid only on Consignee Address part               |
| ContactName         | String    | M         | Shipper Consignee Name           | Length between 5–150 characters                    |
| ContactPhoneNumber  | String    | M         | 050000000                        | Consignee/Shipper Phone Number                     |
| Coordinates         | String    | O         | 24.6789297,46.7029               |                                                    |
| Country             | String    | M         | SA                               | ISO country code                                   |
| District            | String    | O         | Sulimanyah                       |                                                    |
| PostalCode          | String    | O         | 36529                            |                                                    |
| ShortCode           | String    | O         | RRRD2929                         | Short National Address – valid only on Consignee Address |

### Request Sample Body

```json
{
    "ConsigneeAddress": {
        "ContactName": "SMSA Express JED",
        "ContactPhoneNumber": "966000000",
        "ContactPhoneNumber2": "96600000",
        "Coordinates": "21.589886,39.1662759",
        "Country": "SA",
        "District": "Ar Rawhdah",
        "PostalCode": "",
        "City": "Jeddah",
        "AddressLine1": "سمسا حي الروضة",
        "AddressLine2": "Ar Rawdah, Jeddah 23434",
        "ConsigneeID": "",
        "ShortCode": "RRRD2929"
    },
    "ShipperAddress": {
        "ContactName": "Shipper company name",
        "ContactPhoneNumber": "96600000000",
        "Coordinates": "24.6864257,46.6995142",
        "Country": "SA",
        "District": "Sulimanyah",
        "PostalCode": "63529",
        "City": "Riyadh",
        "AddressLine1": "SMSA Express HQ",
        "AddressLine2": "Dababh St"
    },
    "OrderNumber": "FirstOrder001",
    "DeclaredValue": 10,
    "CODAmount": 10,
    "Parcels": 1,
    "ShipDate": "2021-01-01T10:40:53",
    "ShipmentCurrency": "SAR",
    "SMSARetailID": "0",
    "WaybillType": "PDF",
    "Weight": 3,
    "WeightUnit": "KG",
    "ContentDescription": "Shipment contents description",
    "VatPaid": true,
    "DutyPaid": false,
    "ServiceCode": "EDDL"
}
```

### Response Sample

```json
{
    "sawb": "231200021000",
    "createDate": "2021-01-01T10:40:53",
    "shipmentParcelsCount": 1,
    "waybills": [
        {
            "awb": "231200021879",
            "awbFile": "JVBERi0xLjQKJeLjz9MKMSA..."
        }
    ]
}
```

---

## 2. Query B2C Shipment By AWB

> Query existing B2C Shipment by AWB

**Endpoint:**
```http
GET /api/shipment/b2c/query/{AWB} HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
```

### Response Sample

```json
{
    "sawb": "231200021000",
    "createDate": "2021-01-01T10:40:53",
    "shipmentParcelsCount": 1,
    "waybills": [
        {
            "awb": "231200021879",
            "awbFile": "JVBERi0xLjQKJeLjz9MKMSA..."
        }
    ]
}
```

---

## 3. Create C2B (Pickup Return) Shipment

> Create a new Pickup/Return Shipment (C2B)

**Endpoint:**
```http
POST /api/c2b/new HTTP/1.1
Host: {environment_url}
apikey: {API_KEY}
Content-Type: application/json
```

### Request Parameters

| Parameter Name     | Data Type              | Mandatory | Sample                    | Notes                          |
|--------------------|------------------------|-----------|---------------------------|--------------------------------|
| ContentDescription | String                 | M         | Shipment Description and content |                           |
| DeclaredValue      | Float                  | M         | 100                       | Minimum value is 0.1           |
| OrderNumber        | String                 | M         | order221-212              | Maximum length is 50           |
| Parcels            | Int                    | M         | 1                         | Count of boxes per shipment    |
| PickupAddress      | ShipmentAddress Object | M         |                           |                                |
| ReturnToAddress    | ShipmentAddress Object | M         |                           |                                |
| ServiceCode        | String                 | O         | EDCR                      | List of SMSA Service Types available via lookup |
| ShipDate           | DateTime               | M         | 2021-01-01T08:00:00       |                                |
| ShipmentCurrency   | String                 | M         | SAR                       | Currency ISO Code              |
| SMSARetailID       | String                 | O         | 0                         | List of SMSA Offices available via lookup |
| WaybillType        | String                 | O         | PDF                       | PDF or ZPL                     |
| Weight             | Float                  | M         | 0.5                       |                                |
| WeightUnit         | String                 | M         | KG or LB                  | ISO weight measure unit        |

### ShipmentAddress Object

| Parameter Name     | Data Type | Mandatory | Sample                           | Notes                          |
|--------------------|-----------|-----------|----------------------------------|--------------------------------|
| AddressLine1       | String    | M         | Shipper Consignee Address Line 1 | Length between 10–100 characters |
| AddressLine2       | String    | O         | Shipper Consignee Address Line 2 | Length between 0–100 characters |
| City               | String    | M         | Riyadh                           | Length between 3–50 characters |
| ContactName        | String    | M         | Shipper Consignee Name           | Length between 5–150 characters |
| ContactPhoneNumber | String    | M         | 050000000                        | Consignee/Shipper Phone Number |
| Coordinates        | String    | O         | 24.6789297,46.7029               |                                |
| Country            | String    | M         | SA                               | ISO country code               |
| District           | String    | O         | Sulimanyah                       |                                |
| PostalCode         | String    | O         | 36529                            |                                |

### Request Sample Body

```json
{
    "PickupAddress": {
        "ContactName": "SMSA Express JED",
        "ContactPhoneNumber": "966000000",
        "Coordinates": "21.589886,39.1662759",
        "Country": "SA",
        "District": "Ar Rawhdah",
        "PostalCode": "",
        "City": "Jeddah",
        "AddressLine1": "سمسا حي الروضة",
        "AddressLine2": "Ar Rawdah, Jeddah 23434"
    },
    "ReturnToAddress": {
        "ContactName": "Shipper company name",
        "ContactPhoneNumber": "96600000000",
        "Coordinates": "24.6864257,46.6995142",
        "Country": "SA",
        "District": "Sulimanyah",
        "PostalCode": "63529",
        "City": "Riyadh",
        "AddressLine1": "SMSA Express HQ",
        "AddressLine2": "Dababh St"
    },
    "OrderNumber": "FirstPUPorder01",
    "DeclaredValue": 10,
    "Parcels": 1,
    "ShipDate": "2021-01-01T10:40:53",
    "ShipmentCurrency": "SAR",
    "SMSARetailID": "1",
    "WaybillType": "PDF",
    "Weight": 3,
    "WeightUnit": "KG",
    "ContentDescription": "Shipment contents description",
    "ServiceCode": "EDCR"
}
```

### Response Sample

```json
{
    "sawb": "231200021000",
    "createDate": "2021-01-01T10:40:53",
    "shipmentParcelsCount": 1,
    "waybills": [
        {
            "awb": "231200021879",
            "awbFile": "JVBERi0xLjQKJeLjz9MKMSA..."
        }
    ]
}
```

---

## 4. Query C2B (Pickup Return) Shipment

> Query existing Pickup/Return Shipment (C2B) by AWB

**Endpoint:**
```http
GET /api/c2b/query/{AWB} HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
```

### Response Sample

```json
{
    "sawb": "231200021000",
    "createDate": "2021-01-01T10:40:53",
    "shipmentParcelsCount": 1,
    "waybills": [
        {
            "awb": "231200021879",
            "awbFile": "JVBERi0xLjQKJeLjz9MKMSA..."
        }
    ]
}
```

---

## 5. Get Country / Currency Lookup

> Get Currency / Country Lookup

**Endpoint:**
```http
GET /api/lookup/currency HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
```

### Response Sample

```json
[
    {
        "countryName": "Saudi Arabia",
        "countryCode": "SA",
        "currency": "Saudi Riyal",
        "currencyCode": "SAR"
    },
    {
        "countryName": "Bahrain",
        "countryCode": "BH",
        "currency": "Bahraini Dinar",
        "currencyCode": "BHD"
    }
]
```

### Supported Countries & Currencies

| Country Name                  | Country ISO Code | Currency                     | Currency ISO |
|-------------------------------|------------------|------------------------------|--------------|
| Afghanistan                   | AF               | Afghanistan Afghani          | AFA          |
| Albania                       | AL               | Albanian Lek                 | ALL          |
| Algeria                       | DZ               | Algerian Dinar               | DZD          |
| Andorra                       | AD               | Andorran Peseta              | ADP          |
| Angola                        | AO               | Kwanza                       | AOA          |
| Anguilla                      | AI               | East Caribbean Dollar        | XCD          |
| Antigua and Barbuda           | AG               | East Caribbean Dollar        | XCD          |
| Argentina                     | AR               | Argentine Peso               | ARS          |
| Armenia                       | AM               | Armenian Dram                | AMD          |
| Aruba                         | AW               | Aruban Guilder               | AWG          |
| Australia                     | AU               | Australian Dollar            | AUD          |
| Austria                       | AT               | Austrian Schilling           | ATS          |
| Azerbaijan                    | AZ               | Azerbaijanian Manat          | AZM          |
| Bahamas                       | BS               | Bahamian Dollar              | BSD          |
| Bahrain                       | BH               | Bahraini Dinar               | BHD          |
| Bangladesh                    | BD               | Bangladeshi Taka             | BDT          |
| Barbados                      | BB               | Barbados Dollar              | BBD          |
| Belarus                       | BY               | Belarussian Ruble            | BYB          |
| Belgium                       | BE               | Belgian Franc                | BEF          |
| Belize                        | BZ               | Belize Dollar                | BZD          |
| Benin                         | BJ               | CFA Franc (BCEAO)            | XOF          |
| Bermuda                       | BM               | Bermuda Dollar               | BMD          |
| Bolivia                       | BO               | Boliviano                    | BOB          |
| Bosnia & Herzegovina          | BA               | Convertible Marks            | BAM          |
| Botswana                      | BW               | Pula                         | BWP          |
| Brazil                        | BR               | Brazil Real                  | BRL          |
| Brunei Darussalam             | BN               | Brunei Dollar                | BND          |
| Bulgaria                      | BG               | Lev                          | BGL          |
| Burkina Faso                  | BF               | CFA Franc BCEAO              | XOF          |
| Burundi                       | BI               | Burundi Franc                | BIF          |
| Cambodia                      | KH               | Cambodian Riel               | KHR          |
| Cameroon                      | CM               | CFA Franc (BEAC)             | XAF          |
| Canada                        | CA               | Canadian Dollar              | CAD          |
| Cape Verde                    | CV               | Cape Verde Escudo            | CVE          |
| Cayman Islands                | KY               | Cayman Islands Dollar        | KYD          |
| Central African Republic      | CF               | CFA Franc (BEAC)             | XAF          |
| Chad                          | TD               | CFA Franc (BEAC)             | XAF          |
| Chile                         | CL               | Chilean Peso                 | CLP          |
| China                         | CN               | Yuan Renminbi                | CNY          |
| China (Hong Kong S.A.R.)      | HK               | Hong Kong Dollar             | HKD          |
| China (Macau S.A.R.)          | MO               | Pataca                       | MOP          |
| Colombia                      | CO               | Colombian Peso               | COP          |
| Comoros                       | KM               | Comoro                       | KMF          |
| Congo                         | CG               | CFA Franc (BEAC)             | XAF          |
| Congo, Democratic Republic of | CD               | Franc Congolais              | CDF          |
| Cook Islands                  | NZ               | New Zealand Dollar           | NZD          |
| Costa Rica                    | CR               | Costa Rican Colon            | CRC          |
| Croatia                       | HR               | Croatian Kuna                | HRK          |
| Cuba                          | CU               | Cuban Peso                   | CUP          |
| Cyprus                        | CY               | Cyprus Pound                 | CYP          |
| Czech Republic                | CZ               | Czech Koruna                 | CZK          |
| Côte D'Ivoire                 | CI               | CFA Franc (BCEAO)            | XOF          |
| Denmark                       | DK               | Danish Krone                 | DKK          |
| Djibouti                      | DJ               | Djibouti Franc               | DJF          |
| Dominica                      | DM               | East Caribbean Dollar        | XCD          |
| Dominican Republic            | DO               | Dominican Peso               | DOP          |
| East Timor                    | TP               | Timor Escudo                 | TPE          |
| Ecuador                       | EC               | Sucre                        | ECS          |
| Egypt                         | EG               | Egyptian Pound               | EGP          |
| El Salvador                   | SV               | El Salvador Colon            | SVC          |
| Equatorial Guinea             | GQ               | CFA Franc (BEAC)             | XAF          |
| Eritrea                       | ER               | Nafka                        | ERN          |
| Estonia                       | EE               | Kroon                        | EEK          |
| Ethiopia                      | ET               | Ethiopian Birr               | ETB          |
| European Union (ECU)          | XE               | Euro                         | XEU          |
| European Union (Euro)         | EU               | European Currency Unit       | EUR          |
| Falkland Islands              | FK               | Falkland Islands Pound       | FKP          |
| Faroe Islands                 | DK               | Danish Krone                 | DKK          |
| Fiji                          | FJ               | Fiji Dollar                  | FJD          |
| Finland                       | FI               | Finnish Markka               | FIM          |
| France                        | FR               | French Franc                 | FRF          |
| French Polynesia              | XP               | CFP Franc                    | XPF          |
| French Southern Territories   | XP               | CFP Franc                    | XPF          |
| Gabon                         | XP               | CFP Franc                    | XPF          |
| Gambia                        | GM               | Dalasi                       | GMD          |
| Georgia                       | GE               | Lari                         | GEL          |
| Germany                       | DE               | Deutsche Mark                | DEM          |
| Ghana                         | GH               | Ghana Cedi                   | GHC          |
| Gibraltar                     | GI               | Gibraltar Pound              | GIP          |
| Granada                       | GD               | East Caribbean Dollar        | XCD          |
| Greece                        | GR               | Drachma                      | GRD          |
| Greenland                     | DK               | Danish Krone                 | DKK          |
| Guatemala                     | GT               | Guatemalan Quetzal           | GTQ          |
| Guinea                        | GN               | Guinea Franc                 | GNF          |
| Guinea-Bissau                 | GW               | Guinea-Bissau Peso           | GWP          |
| Guyana                        | GY               | Guyana Dollar                | GYD          |
| Haiti                         | HT               | Haiti Gourde                 | HTG          |
| Honduras                      | HN               | Honduran Lempira             | HNL          |
| Hungary                       | HU               | Forint                       | HUF          |
| Iceland                       | IS               | Iceland Krona                | ISK          |
| India                         | IN               | Indian Rupee                 | INR          |
| Indonesia                     | ID               | Indonesian Rupiah            | IDR          |
| International Monetary Fund   | XD               | SDR                          | XDR          |
| Iran                          | IR               | Iranian Rial                 | IRR          |
| Iraq                          | IQ               | Iraqi Dinar                  | IQD          |
| Ireland                       | IE               | Irish Pound                  | IEP          |
| Italy                         | IT               | Italian Lira                 | ITL          |
| Jamaica                       | JM               | Jamaican Dollar              | JMD          |
| Japan                         | JP               | Yen                          | JPY          |
| Jordan                        | JO               | Jordanian Dinar              | JOD          |
| Kazakhstan                    | KZ               | Kazakhstan Tenge             | KZT          |
| Kenya                         | KE               | Kenyan Shilling              | KES          |
| Korea, Republic of            | KR               | South Korean Won             | KRW          |
| Kuwait                        | KW               | Kuwaiti Dinar                | KWD          |
| Kyrgyzstan                    | KG               | Kyrgyzstan Som               | KGS          |
| Latvia                        | LV               | Latvian Lats                 | LVL          |
| Lebanon                       | LB               | Lebanese Pound               | LBP          |
| Lesotho                       | ZA               | Rand                         | ZAR          |
| Liberia                       | LR               | Liberian Dollar              | LRD          |
| Libyan Arab Jamahirya         | LY               | Libyan Dinar                 | LYD          |
| Lithuania                     | LT               | Lithuanian Litas             | LTL          |
| Luxembourg                    | LU               | Luxembourg Franc             | LUF          |
| Macedonia (Former Yug. Rep.)  | MK               | Macedonian Denar             | MKD          |
| Madagascar                    | MG               | Malagasy Franc               | MGF          |
| Malawi                        | MW               | Kwacha                       | MWK          |
| Malaysia                      | MY               | Malaysian Ringgit            | MYR          |
| Maldives                      | MV               | Maldives Rufiyaa             | MVR          |
| Mali                          | ML               | CFA Franc BCEAO              | XOF          |
| Malta                         | MT               | Maltese Lira                 | MTL          |
| Mauritania                    | MR               | Mauritanian Ouguiya          | MRO          |
| Mauritius                     | MU               | Mauritius Rupee              | MUR          |
| Mexico                        | MX               | Mexican Peso                 | MXN          |
| Moldova, Republic of          | MD               | Moldovan Leu                 | MDL          |
| Mongolia                      | MN               | Mongolian Tugrik             | MNT          |
| Montserrat                    | MS               | East Caribbean Dollar        | XCD          |
| Morocco                       | MA               | Moroccan Dirham              | MAD          |
| Mozambique                    | MZ               | Mozambique Metical           | MZM          |
| Myanmar                       | MM               | Myanmar Kyat                 | MMK          |
| Namibia                       | ZA               | Rand                         | ZAR          |
| Nepal                         | NP               | Nepalese Rupee               | NPR          |
| Netherlands                   | NL               | Netherlands Gulder           | NLG          |
| Netherlands Antilles          | AN               | Netherlands Antillian Guilder| ANG          |
| New Caledonia                 | XP               | CFP Franc                    | XPF          |
| New Zealand                   | NZ               | New Zealand Dollar           | NZD          |
| Nicaragua                     | NI               | Nicaraguan Cordoba Oro       | NIO          |
| Niger                         | NE               | CFA Franc BCEAO              | XOF          |
| Nigeria                       | NG               | Nigerian Naira               | NGN          |
| Niue                          | NZ               | New Zealand Dollar           | NZD          |
| North Korea Republic          | KP               | North Korean Won             | KPW          |
| Norway                        | NO               | Norwegian Krone              | NOK          |
| Oman                          | OM               | Rial Omani                   | OMR          |
| Pakistan                      | PK               | Pakistan Rupee               | PKR          |
| Panama                        | PA               | Balboa                       | PAB          |
| Papua New Guinea              | PG               | Papua New Guinea Kina        | PGK          |
| Paraguay                      | PY               | Paraguay Guarani             | PYG          |
| Peru                          | PE               | Peru Nuevo Sol               | PEN          |
| Philippines                   | PH               | Philippine Peso              | PHP          |
| Pitcairn                      | NZ               | New Zealand Dollar           | NZD          |
| Poland                        | PL               | Poland Zloty                 | PLN          |
| Portugal                      | PT               | Portuguese Escudo            | PTE          |
| Qatar                         | QA               | Qatari Rial                  | QAR          |
| Romania                       | RO               | Romanian Leu                 | ROL          |
| Russian Federation            | RU               | Russian Ruble                | RUR          |
| Rwanda                        | RW               | Rwanda Franc                 | RWF          |
| Saint Helena                  | SH               | St. Helena Pound             | SHP          |
| Saint Kitts and Nevis         | KN               | East Caribbean Dollar        | XCD          |
| Saint Pierre and Miquelon     | PM               | French Franc                 | XCD          |
| Saint Vincent and the Grenadines | VC            | East Caribbean Dollar        | XCD          |
| Samoa                         | WS               | Tala                         | WST          |
| San Marino                    | IT               | Italian Lira                 | ITL          |
| Sao Tome and Principe         | ST               | Sao Tome and Principe Dobra  | STD          |
| Saudi Arabia                  | SA               | Saudi Riyal                  | SAR          |
| Senegal                       | SN               | CFA Franc BCEAO              | XOF          |
| Seychelles                    | SC               | Seychelles Rupee             | SCR          |
| Sierra Leone                  | SL               | Sierra Leone Leone           | SLL          |
| Singapore                     | SG               | Singapore Dollar             | SGD          |
| Slovakia                      | SK               | Slovak Koruna                | SKK          |
| Slovenia                      | SI               | Slovenia Tolar               | SIT          |
| Solomon Island                | SB               | Solomon Islands Dollar       | SBD          |
| Somalia                       | SO               | Somalia Shilling             | SOS          |
| South Africa                  | ZA               | South African Rand           | ZAR          |
| Spain                         | ES               | Spanish Peseta               | ESP          |
| Sri Lanka                     | LK               | Sri Lanka Rupee              | LKR          |
| Sudan                         | SD               | Sudanese Dinar               | SDP          |
| Suriname                      | SR               | Suriname Guilder             | SRG          |
| Swaziland                     | SZ               | Swaziland Lilangeni          | SZL          |
| Sweden                        | SE               | Swedish Krona                | SEK          |
| Switzerland                   | CH               | Swiss Franc                  | CHF          |
| Syrian Arab Republic          | SY               | Syrian Pound                 | SYP          |
| Taiwan                        | TW               | New Taiwan Dollar            | TWD          |
| Tajikistan                    | TJ               | Tajik Ruble                  | TJR          |
| Tanzania, United Republic of  | TZ               | Tanzanian Shilling           | TZS          |
| Thailand                      | TH               | Thai Baht                    | THB          |
| Togo                          | TG               | CFA Franc BCEAO              | XOF          |
| Tokelau                       | NZ               | New Zealand Dollar           | NZD          |
| Tonga                         | TO               | Tonga Pa'anga                | TOP          |
| Trinidad and Tobago           | TT               | Trinidad and Tobago Dollar   | TTD          |
| Tunisia                       | TN               | Tunisian Dinar               | TND          |
| Turkey                        | TR               | Turkish Lira                 | TRY          |
| Turkmenistan                  | TM               | Manat                        | TMM          |
| Uganda                        | UG               | Ugandan Shilling             | UGX          |
| Ukraine                       | UA               | Hryvnia                      | UAH          |
| United Arab Emirates          | AE               | UAE Dirham                   | AED          |
| United Kingdom                | GB               | Pound Sterling               | GBP          |
| United States of America      | US               | US Dollar                    | USD          |
| Uruguay                       | UY               | Peso Uruguayo                | UYU          |
| Uzbekistan                    | UZ               | Uzbekistan Sum               | UZS          |
| Vanuatu                       | VU               | Vanuatu Vatu                 | VUV          |
| Venezuela                     | VE               | Venezuela Bolivar            | VEB          |
| Viet Nam                      | VN               | Viet Nam Dong                | VND          |
| Wallis and Futuna             | XP               | CFP Franc                    | XPF          |
| Western Sahara                | MA               | Moroccan Dirham              | MAD          |
| Yemen                         | YE               | Yemeni Rial                  | YER          |
| Yugoslavia                    | YU               | Yugoslavian Dinar            | YUN          |
| Zaire                         | ZR               | Unknown                      | ZRN          |
| Zambia                        | ZM               | Zambia Kwacha                | ZMK          |
| Zimbabwe                      | ZW               | Zimbabwe Dollar              | ZWD          |

---

## 6. Get SMSA Offices Lookup

> Get List of SMSA Offices

**Endpoint:**
```http
GET /api/lookup/smsaoffices HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
```

### Response Sample

```json
[
    {
        "code": "1",
        "address": "Al Sawidi Dist. Al Suwaidi Main St.",
        "cityName": "Riyadh",
        "addressAR": "حي السويدي - طريق السويدي العام",
        "coordinates": "24.598472,46.687158",
        "firstShift": "08:00 - 23:00",
        "secondShift": "",
        "weekendShift": "OFF"
    },
    {
        "code": "2",
        "address": "Malaz - Al Ahsa St.",
        "cityName": "Riyadh",
        "addressAR": "الملز - شارع الأحساء",
        "coordinates": "24.694371,46.732012",
        "firstShift": "08:00 - 23:00",
        "secondShift": "",
        "weekendShift": "16:00 - 20:00"
    }
]
```

### SMSA Offices Directory (Selected)

| Code | Address                                       | City              | Coordinates         | First Shift     | Second Shift    | Weekend Shift   |
|------|-----------------------------------------------|-------------------|---------------------|-----------------|-----------------|-----------------|
| 1    | Al Sawidi Dist. Al Suwaidi Main St.           | Riyadh            | 24.5984,46.6872     | 08:00 - 23:00   |                 | OFF             |
| 2    | Malaz - Al Ahsa St.                           | Riyadh            | 24.5985,46.7324     | 08:00 - 23:00   |                 | 16:00 - 20:00   |
| 3    | Al Ghurabi St.                                | Riyadh            | 24.6462,46.7185     | 09:00 - 21:00   |                 | 16:00 - 20:00   |
| 4    | Dhahrat Liban Dist. - Alshefa Rd.             | Riyadh            | 24.6325,46.5645     | 10:00 - 14:00   | 16:00 - 20:00   | OFF             |
| 5    | Al Manar Dist. - Alshafi St                   | Riyadh            | 24.723,46.7875      | 08:00 - 23:00   |                 | OFF             |
| 6    | Al Rabwah - Exit 14 (Jarir Bookstore)         | Riyadh            | 24.6917,46.7655     | 08:00 - 23:00   |                 | OFF             |
| 7    | Sulaimanya - Dhabab St.                       | Riyadh            | 24.6785,46.7023     | 08:00 - 23:00   |                 | 16:00 - 20:00   |
| 12   | Alsharafiyah - King Abdullah Road             | Jeddah            | 21.5114,39.1883     | 08:00 - 23:00   |                 | OFF             |
| 13   | AlRawdhah, Madinah Rd.                        | Jeddah            | 21.5689,39.1688     | 08:00 - 23:00   |                 | 16:00 - 20:00   |
| 23   | King Soud Rd. Al Amamrah                      | Dammam            | 26.4425,50.1088     | 09:00 - 21:00   |                 | OFF             |
| 28   | Khubar Shamaliyah, King Abdulaziz Rd.         | Khubar            | 26.2907,50.2076     | 09:00 - 21:00   |                 | OFF             |
| 31   | Nuzha St.                                     | Makkah            | 21.4378,39.7941     | 08:00 - 23:00   |                 | 16:00 - 20:00   |
| 33   | Josham dist. King Abdullah Rd.                | Madinah           | 24.4554,39.6685     | 09:00 - 12:00   | 16:00 - 21:00   | OFF             |
| 381  | Dragon Mart 2, International City             | Dubai             | 25.1721,55.4240     |                 |                 | OFF             |
| 383  | Al Nahyan, Murror Road                        | Abu Dhabi         | 24.4642,54.3838     |                 |                 | OFF             |
| 384  | 92 Shehab St., Mohandeseen                    | Cairo             | 30.0587,31.2001     |                 |                 | OFF             |
| 385  | Salah Salem St., Heliopolis                   | Cairo             | 30.0770,31.3083     |                 |                 | OFF             |
| 396  | RSC – BH Muharraq, GLS Compound              | Muharraq          | 26.2743,50.6125     |                 |                 | OFF             |
| 427  | SMSA Egypt - Mansoura                         | Mansoura          |                     |                 |                 | OFF             |
| 428  | SMSA Egypt - Tanta                            | Tanta             |                     |                 |                 | OFF             |
| 429  | SMSA Egypt - Port Said                        | Port Said         |                     |                 |                 | OFF             |
| 443  | Shop 64, Building 3427, Road 185, Block 701   | Manama            | 26.1954,50.5443     |                 |                 | OFF             |

> **Note:** The full offices list contains 401 entries. See the API response for the complete directory.

---

## 7. Send Shipment Invoice

> Push Shipment Invoice

**Endpoint:**
```http
POST /api/invoice HTTP/1.1
Host: {environment_url}
apikey: {API_KEY}
Content-Type: application/json
```

### Request Parameters (1.1)

| Parameter Name | Data Type    | Mandatory | Sample       | Notes                                    |
|----------------|--------------|-----------|--------------|------------------------------------------|
| AWB            | String       | M         | 231200001258 | 12 digits                                |
| Currency       | String       | M         | SAR          | ISO Currency Code                        |
| InvoiceDate    | String       | M         | 22/02/2022   | Format: dd/mm/yyyy                       |
| Items          | Array[Item]  | M         | Array[]      | Array of invoice items (see table 1.2)   |
| WeightUnit     | String       | M         | KG \| LB     | Only KG / LB are allowed                 |

### Invoice Item (1.2)

| Parameter Name  | Data Type      | Mandatory | Sample                  | Notes                                          |
|-----------------|----------------|-----------|-------------------------|------------------------------------------------|
| CountryOfOrigin | String         | O         | SA                      | Valid ISO country code (exactly two letters)   |
| ItemDescription | String         | M         | Laptop / Computer       |                                                |
| ItemHSCode      | String         | M         | 1230000000              |                                                |
| ItemReference   | String         | M         | ItemReferenceNum01      | Item unique reference or tracking number       |
| ItemValue       | decimal(10,2)  | M         | 10.50                   |                                                |
| Quantity        | Int            | M         | 5                       | Quantity per item                              |
| QuantityUnit    | String         | M         | UNIT                    |                                                |
| Sequence        | Int            | M         | 1                       | Item sequence (each shipment may have up to 100 items) |
| Weight          | decimal(10,2)  | M         | 5.20                    |                                                |

### Request Sample Body

```json
{
    "AWB": "231215638548",
    "Currency": "SAR",
    "WeightUnit": "KG",
    "InvoiceDate": "02/02/2022",
    "Items": [
        {
            "sequence": 1,
            "ItemHSCode": "123456",
            "QuantityUnit": "UNIT",
            "ItemReference": "REF02",
            "ItemDescription": "ITEM 02 Description",
            "Weight": 2.00,
            "ItemValue": 200.00,
            "Quantity": 10,
            "CountryOfOrigin": "SA"
        },
        {
            "sequence": 2,
            "ItemHSCode": "223456",
            "QuantityUnit": "UNIT",
            "ItemReference": "REF03",
            "ItemDescription": "ITEM 03 Description",
            "Weight": 2.00,
            "ItemValue": 200.00,
            "Quantity": 2,
            "CountryOfOrigin": "SA"
        }
    ]
}
```

### Response Sample

```
Invoice logged successfully
```

---

## 8. Cancel Reverse Pickup Shipments

> Cancel Reverse Pickup Shipments

**Endpoint:**
```http
POST /api/c2b/cancel/{AWB} HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
```

### Response Sample

```
Shipment Cancelled Successfully!
```

---

## 9. Track Bulk Shipments

> Track Bulk B2C Shipments by AWB

**Endpoint:**
```http
POST api/track/bulk/ HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
Content-Type: application/json
```

### Request Sample Body

```json
[
    "231200021000",
    "231200022222"
]
```

### Response Sample

```json
[
    {
        "AWB": "231200021000",
        "Reference": "REF1234567895",
        "Pieces": 1,
        "CODAmount": 0.0,
        "ContentDesc": "Shipment contents description",
        "RecipientName": "Abdulaziz",
        "OriginCity": "Jeddah",
        "OriginCountry": "SA",
        "DesinationCity": "Riyadh",
        "DesinationCountry": "SA",
        "isDelivered": true,
        "Scans": [
            {
                "ReceivedBy": "Abdulaziz",
                "City": "Riyadh",
                "ScanType": "DL",
                "ScanDescription": "Delivered",
                "ScanDateTime": "2024-01-10T11:00:00",
                "ScanTimeZone": "+03:00"
            },
            {
                "City": "Riyadh",
                "ScanType": "OD",
                "ScanDescription": "Out for Delivery",
                "ScanDateTime": "2024-01-10T10:00:00",
                "ScanTimeZone": "+03:00"
            },
            {
                "City": "Riyadh",
                "ScanType": "HOP",
                "ScanDescription": "Shipment Departed SMSA Sorting Facility",
                "ScanDateTime": "2024-01-10T09:00:00",
                "ScanTimeZone": "+03:00"
            }
        ]
    },
    {
        "AWB": "231200022222",
        "Reference": "REF00000000111",
        "Pieces": 1,
        "CODAmount": 100,
        "ContentDesc": "Shipment contents description",
        "RecipientName": "Mohammed",
        "OriginCity": "Jeddah",
        "OriginCountry": "SA",
        "DesinationCity": "Dammam",
        "DesinationCountry": "SA",
        "Scans": [
            {
                "City": "Dammam",
                "ScanType": "OD",
                "ScanDescription": "Out for Delivery",
                "ScanDateTime": "2024-01-10T10:00:00",
                "ScanTimeZone": "+03:00"
            },
            {
                "City": "Dammam",
                "ScanType": "HOP",
                "ScanDescription": "Shipment Departed SMSA Sorting Facility",
                "ScanDateTime": "2024-01-10T09:00:00",
                "ScanTimeZone": "+03:00"
            }
        ]
    }
]
```

---

## 10. Track Single Shipment

> Track B2C Shipment by AWB

**Endpoint:**
```http
GET api/track/single/{AWB} HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
```

### Response Sample

```json
{
    "AWB": "231200021000",
    "Reference": "REF1234567895",
    "Pieces": 1,
    "CODAmount": 0.0,
    "ContentDesc": "Shipment contents description",
    "RecipientName": "Abdulaziz",
    "OriginCity": "Jeddah",
    "OriginCountry": "SA",
    "DesinationCity": "Riyadh",
    "DesinationCountry": "SA",
    "isDelivered": true,
    "Scans": [
        {
            "ReceivedBy": "Abdulaziz",
            "City": "Riyadh",
            "ScanType": "DL",
            "ScanDescription": "Delivered",
            "ScanDateTime": "2024-01-10T11:00:00",
            "ScanTimeZone": "+03:00"
        },
        {
            "City": "Riyadh",
            "ScanType": "OD",
            "ScanDescription": "Out for Delivery",
            "ScanDateTime": "2024-01-10T10:00:00",
            "ScanTimeZone": "+03:00"
        },
        {
            "City": "Riyadh",
            "ScanType": "HOP",
            "ScanDescription": "Shipment Departed SMSA Sorting Facility",
            "ScanDateTime": "2024-01-10T09:00:00",
            "ScanTimeZone": "+03:00"
        }
    ]
}
```

> **Note:** `isDelivered` and `ReceivedBy` fields are only present in delivered shipments.

---

## 11. Get Status Lookup

> Get Status Lookup

**Endpoint:**
```http
GET /api/track/statuslookup HTTP/1.1
Host: {environment_url}
apikey: {API_KEY}
Content-Type: application/json
```

### Response Sample

```json
[
    {
        "Code": "AF",
        "ScanDescEN": "Arrived Delivery Facility",
        "ScanDescAR": "وصلت محطة التوزيع"
    },
    {
        "Code": "CC",
        "ScanDescEN": "Processing for Consignee Collection",
        "ScanDescAR": "تحت المعالجة لإستلام العميل"
    },
    {
        "Code": "CR",
        "ScanDescEN": "Customs Released",
        "ScanDescAR": "تم التخليص الجمركي"
    },
    {
        "Code": "DE",
        "ScanDescEN": "Delivery Exception",
        "ScanDescAR": "تعذر تسليم الشحنة"
    }
]
```

---

## 12. New 2-Way Shipment

> Create a new Two Way Shipment

**Endpoint:**
```http
POST /api/TwoWayShipment/new HTTP/1.1
Host: {environment_url}
apikey: {API_KEY}
Content-Type: application/json
```

### Request Parameters

| Parameter Name     | Data Type              | Mandatory | Sample                    | Notes                          |
|--------------------|------------------------|-----------|---------------------------|--------------------------------|
| ConsigneeAddress   | ShipmentAddress Object | M         |                           |                                |
| ContentDescription | String                 | M         | Shipment Description      |                                |
| DeclaredValue      | Float                  | M         | 100                       |                                |
| DutyPaid           | Boolean                | O         | false                     |                                |
| OrderNumber        | String                 | M         | order221-212              |                                |
| Parcels            | Int                    | M         | 1                         | Count of boxes per shipment    |
| ShipDate           | DateTime               | M         | 2021-01-01T08:00:00       |                                |
| ShipmentCurrency   | String                 | M         | SAR                       | Currency ISO Code              |
| ShipperAddress     | ShipmentAddress Object | M         |                           |                                |
| SMSARetailID       | String                 | O         | 1                         | List of SMSA Offices via lookup |
| VatPaid            | Boolean                | O         | true                      |                                |
| WaybillType        | String                 | O         | PDF                       | PDF or ZPL                     |
| Weight             | Float                  | M         | 0.5                       |                                |
| WeightUnit         | String                 | M         | KG or LB                  | ISO weight measure unit        |

### ShipmentAddress Object

| Parameter Name     | Data Type | Mandatory | Sample                           | Notes                           |
|--------------------|-----------|-----------|----------------------------------|---------------------------------|
| AddressLine1       | String    | M         | Shipper Consignee Address Line 1 | Length between 10–100 characters |
| AddressLine2       | String    | O         | Shipper Consignee Address Line 2 | Length between 0–100 characters |
| City               | String    | M         | Riyadh                           | Length between 3–50 characters  |
| ConsigneeID        | String    | O         | 1234567890                       | Valid only on Consignee Address  |
| ContactName        | String    | M         | Shipper Consignee Name           | Length between 5–150 characters |
| ContactPhoneNumber | String    | M         | 050000000                        | Consignee/Shipper Phone Number  |
| Coordinates        | String    | O         | 24.6789297,46.7029               |                                 |
| Country            | String    | M         | SA                               | ISO country code                |
| District           | String    | O         | Sulimanyah                       |                                 |
| PostalCode         | String    | O         | 36529                            |                                 |

### Request Sample Body

```json
{
    "ConsigneeAddress": {
        "ContactName": "SMSA Express JED",
        "ContactPhoneNumber": "966000000",
        "ContactPhoneNumber2": "96600000",
        "Coordinates": "21.589886,39.1662759",
        "Country": "SA",
        "District": "Ar Rawhdah",
        "PostalCode": "",
        "City": "Jeddah",
        "AddressLine1": "سمسا حي الروضة",
        "AddressLine2": "Ar Rawdah, Jeddah 23434",
        "ConsigneeID": ""
    },
    "ShipperAddress": {
        "ContactName": "Shipper name",
        "ContactPhoneNumber": "96600000000",
        "Coordinates": "24.6864257,46.6995142",
        "Country": "SA",
        "District": "Sulimanyah",
        "PostalCode": "63529",
        "City": "Riyadh",
        "AddressLine1": "Dababh St",
        "AddressLine2": "Dababh St"
    },
    "OrderNumber": "FirstOrder001",
    "DeclaredValue": 10,
    "Parcels": 1,
    "ShipDate": "2021-01-01T10:40:53",
    "ShipmentCurrency": "SAR",
    "SMSARetailID": "0",
    "WaybillType": "PDF",
    "Weight": 3,
    "WeightUnit": "KG",
    "ContentDescription": "Shipment contents description",
    "VatPaid": true,
    "DutyPaid": false
}
```

### Response Sample

```json
{
    "sawb": "231200021000",
    "createDate": "2021-01-01T10:40:53",
    "shipmentParcelsCount": 1,
    "waybills": [
        {
            "awb": "231200021879",
            "awbFile": "JVBERi0xLjQKJeLjz9MKMSA...",
            "returnBarcode": "JVBERi0xLjQKJeLjz9MKMSA..."
        }
    ]
}
```

---

## 13. Cities Lookup

> Cities Lookup

**Endpoint:**
```http
GET /api/lookup/cities/{countrycode} HTTP/1.1
Host: {environment_url}
apikey: {API_KEY}
Content-Type: application/json
```

### Response Sample

```json
[
    {
        "cityName": "Madinah",
        "cityCode": "MED",
        "countryCode": "SA",
        "currencyCode": "SAR",
        "currencyName": "Saudi Riyal"
    },
    {
        "cityName": "Riyadh",
        "cityCode": "RUH",
        "countryCode": "SA",
        "currencyCode": "SAR",
        "currencyName": "Saudi Riyal"
    },
    {
        "cityName": "Tabuk",
        "cityCode": "TUU",
        "countryCode": "SA",
        "currencyCode": "SAR",
        "currencyName": "Saudi Riyal"
    }
]
```

---

## 14. Track Single Shipment By Reference

> Track B2C Shipment by Reference

**Endpoint:**
```http
GET api/track/reference/{reference} HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
```

### Response Sample

```json
{
    "AWB": "231200021000",
    "Reference": "REF1234567895",
    "Pieces": 1,
    "CODAmount": 0.0,
    "ContentDesc": "Shipment contents description",
    "RecipientName": "Abdulaziz",
    "OriginCity": "Jeddah",
    "OriginCountry": "SA",
    "DesinationCity": "Riyadh",
    "DesinationCountry": "SA",
    "isDelivered": true,
    "Scans": [
        {
            "ReceivedBy": "Abdulaziz",
            "City": "Riyadh",
            "ScanType": "DL",
            "ScanDescription": "Delivered",
            "ScanDateTime": "2024-01-10T11:00:00",
            "ScanTimeZone": "+03:00"
        },
        {
            "City": "Riyadh",
            "ScanType": "OD",
            "ScanDescription": "Out for Delivery",
            "ScanDateTime": "2024-01-10T10:00:00",
            "ScanTimeZone": "+03:00"
        },
        {
            "City": "Riyadh",
            "ScanType": "HOP",
            "ScanDescription": "Shipment Departed SMSA Sorting Facility",
            "ScanDateTime": "2024-01-10T09:00:00",
            "ScanTimeZone": "+03:00"
        }
    ]
}
```

---

## 15. Validate Short Address

> Get Full Address By Short Code

**Endpoint:**
```http
GET api/Lookup/FullAddressByShortCode/{ShortCode} HTTP/1.1
Host: {environment_url}
ApiKey: {API_Key}
Content-Type: application/json
```

### Response Sample

```json
{
    "address1": "2239 Al Urubah Rd - Al Olaya Dist.",
    "address2": "RIYADH 12214 - 9597",
    "buildingNumber": "2239",
    "street": "Al Urubah Rd",
    "district": "Al Olaya Dist.",
    "city": "RIYADH",
    "postCode": "12214",
    "additionalNumber": "9597",
    "regionName": "Riyadh",
    "latitude": "24.71142483",
    "longitude": "46.67439068"
}
```

---

## 16. Push ID Details

> Submit identity document details for a shipment.

**Endpoint:**
```http
POST /api/shipment/identity-details HTTP/1.1
Host: {environment_url}
apikey: {API_KEY}
Content-Type: application/json
```

**Authentication:** `ApiKey` header (same as other shipment endpoints).

### Request Parameters

| Parameter Name    | Data Type | Mandatory | Sample       | Notes                                                          |
|-------------------|-----------|-----------|--------------|----------------------------------------------------------------|
| awb               | String    | M         | 123456789012 | 12-digit AWB number                                            |
| birthDate         | String    | M         | 1990-05-20   | Date of birth (format: yyyy-MM-dd)                             |
| documentType      | String    | M         | PASSPORT     | Allowed values: `PASSPORT`, `ID_CARD`, `RESIDENCE_PERMIT`      |
| idName            | String    | M         | John Doe     | Full name as on document                                       |
| idNumber          | String    | M         | AB123456     | Document number                                                |
| issueDate         | String    | M         | 2020-01-15   | Document issue date (format: yyyy-MM-dd)                       |
| nationality       | String    | M         | US           | ISO country code (e.g. US, SA)                                 |
| shipmentReference | String    | O         | REF-001      | Your shipment reference                                        |

### Response Codes

| Status | Description                                      |
|--------|--------------------------------------------------|
| 200    | Success – returns `{ "id", "awb", "message" }`   |
| 400    | Validation error (invalid or missing fields)     |
| 401    | No or invalid ApiKey header                      |
| 500    | Server / save failure                            |

### Request Sample Body

```json
{
    "awb": "123456789012",
    "shipmentReference": "REF-001",
    "idName": "John Doe",
    "documentType": "PASSPORT",
    "idNumber": "AB123456",
    "issueDate": "2020-01-15",
    "birthDate": "1990-05-20",
    "nationality": "US"
}
```

### Response Sample (200)

```json
{
    "id": 1,
    "awb": "123456789012",
    "message": "Identity details saved successfully"
}
```

---

*End of SMSA Express API Documentation*
