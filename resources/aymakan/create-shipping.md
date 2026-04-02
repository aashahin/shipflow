# Create Shipping API
---
*   [Introduction](/docs/aymakan-v2/create-shipping#intro)
*   [Request and Response](/docs/aymakan-v2/create-shipping#endpoint-request)

## Introduction
This API provides an interface to create a new shipment at Aymakan.

## Request and Response
This API only accepts `POST` requests.

### Development API End Point URL
https://dev-api.aymakan.com.sa/v2/shipping/create

### Production API End Point URL
https://api.aymakan.net/v2/shipping/create

### Headers
The following headers should be sent along with the request

*   Accept: application/json
*   Authorization: `Your account security code / Api Token`

### Request
Below table list the request parameters which can be sent to Shipping Create API.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| requested\_by | String | Yes | The name of the person who is creating the shipping. It can be the employee name who is responsible for it |
| declared\_value | Decimal | Yes | The amount of the order. This value is not visible on the shipping label. |
| declared\_value\_currency | String | No | The declared value currency. Default to SAR if no other currency is provided. Possible values are SAR, USD, AED. This value is not visible on the shipping label. |
| reference | AlphaNumeric | No | The order reference if available. It should be unique. If the reference number is already used a validation error will be returned `The reference has already been taken` |
| customer\_tracking | String | No | Can be used to override Aymakan customer tracking with your own tracking number. Note: This won't work for all customers and you need to contact operations to activate this feature. |
| service\_type | String | No | The service type code. Default is `ONP` (ecommerce). See service codes table below for available options. |
| is\_cod | Numeric (Bool) | No | If order is cash on delivery, set to 1. Default is 0. |
| cod\_amount | Decimal | Conditional | If is\_cod is 1, then required, else optional. The COD amount which needs to be collected. |
| fulfilment\_customer\_name | String | Conditional | If customer is fufilment customer, then required, and customer has to provide their customer name in this field. Then this name will display on AWB. |
| currency | String | No | The currency of the amount. Default to SAR. |
| delivery\_name | String | Yes | The delivery person name to whom that shipping will be delivered. |
| delivery\_email | String | No | The delivery person email. It is optional, but if provided, then it should be valid email address. |
| delivery\_city | String | Yes | A predefined city name. Please check the [Cities API](cities). A list of cities can be downloaded from here [Download AyMakan Cities](/cities) |
| delivery\_address | String | Yes | Delivery address. |
| delivery\_neighbourhood | String | No | City neighborhood for the delivery. |
| delivery\_postcode | String | No | Delivery Post code |
| delivery\_country | String | Yes | ISO Code for the country. Default to `SA` for Saudi Arabia |
| delivery\_phone | Number | Yes | Delivery Phone Number. Only digits should be provided |
| delivery\_description | String | No | Any specific delivery description for that shipping |
| delivery\_national\_address | Object | No | National address details for delivery location. See National Address structure below |
| collection\_national\_address | Object | No | National address details for collection location. See National Address structure below |
| collection\_name | String | Yes | The main collection or entity or business name who is creating the shipping |
| collection\_email | String | No | The collection email |
| collection\_city | String | Yes | A predefined city name. Please check the [Cities API](cities). A list of cities can be downloaded from here [Download AyMakan Cities](/cities) |
| collection\_address | String | Yes | Collection point address, from where the shipping will be collected |
| collection\_neighbourhood | String | No | City neighborhood for the Collection. |
| collection\_postcode | String | No | Collection point post code |
| collection\_country | String | Yes | ISO Code for the country. Default to `SA` for Saudi Arabia |
| collection\_phone | Number | Yes | Collection phone number. Phone number should be all numbers |
| collection\_description | String | No | Any description for the collection of the shipping. |
| weight | Decimal | No | The weight of the shipment |
| length | Decimal | No | The length of the shipment in cm. Used for volumetric weight calculation |
| width | Decimal | No | The width of the shipment in cm. Used for volumetric weight calculation |
| height | Decimal | No | The height of the shipment in cm. Used for volumetric weight calculation |
| pieces | Integer | Yes | The total number of pieces that single shipping will have. For example, some shipping will have more items, which can't be enclosed in a single packaging, so it is possible to pack them in multiple cartons. Those number of cartons means pieces here. |
| items\_count | Integer | No | The total number of physical items in the shipment |
| is\_insured | boolean | No | If shipment is insured, set to 1. Default is 0. |

### Service Type Codes
The following service type codes are available for the `service_type` parameter:

| Code | Service Type | Description |
| :--- | :--- | :--- |
| ONP | Ecommerce | Default ecommerce service code |
| DOC | Documents | Documents or banking docs service |
| SDD | Same Day Delivery | Same day delivery service |
| RVP | Reverse Pickup | Reverse pickup service |
| EXH | Exchange | Exchange service |
| LOC | Lockers | Lockers service |
| BLK | Heavy | Heavy and bulky service |
| PLT | Pallet | Pallet service |
| IPX | Import Express | Import express service (International) |
| EPX | Export Express | Export express service (International) |

### National Address Structure
When using `delivery_national_address` or `collection_national_address`, provide an object with the following structure:

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| short\_code | String | Yes | The national address short code (e.g., "ABCD1234") |
| building\_number | String | No | Building number from the national address |
| street\_name | String | No | Street name from the national address |
| district | String | No | District/neighborhood name |
| city | String | No | City name |
| post\_code | String | No | Postal code |
| additional\_number | String | No | Additional number from the national address |

### International Metadata
When creating international shipments, you can attach additional data via `international_metadata`.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| document\_id | Integer | No | ID returned by Paperless Document Upload API. References the uploaded invoice/document to be submitted electronically. |
| tax\_identification\_number | String | No | Shipper tax/VAT/TIN identifier to include on customs documentation. |
| invoice\_number | String | No | Commercial invoice number associated with the shipment. |
| invoice\_date | Date (YYYY-MM-DD) | No | Commercial invoice date in ISO format (e.g., `2025-05-22`). |

> Treat the `document_id` as the reusable document key created in `paperless_documents`. Upload the file first via Paperless Document Upload to get this value.
>
> {warning} To be compatible with future API updates and releases, Please use the cities in the Cities API. As of now, Aymakan is not validating the city in the API requests, but it soon it will be implemented.

A sample `POST` request body is below with only the required data:

```json
{
 "requested_by": "Test3",
 "declared_value": 1,
 "declared_value_currency": "SAR",
 "reference": "",
 "is_cod": 1,
 "cod_amount": 12,
 "currency": "SAR",
 "delivery_name": "Ahmed",
 "delivery_email": "Ahmed@email.com",
 "delivery_city": "Riyadh",
 "delivery_address": "Riyadh",
 "delivery_neighbourhood": "Al Sahafa",
 "delivery_postcode": 11543,
 "delivery_country": "SA",
 "delivery_phone": 540000000,
 "delivery_description": "",
 "delivery_national_address": {
  "short_code": "ABCD1234",
  "building_number": "1234",
  "street_name": "King Fahd Road",
  "district": "Al Olaya",
  "city": "Riyadh",
  "post_code": "11543",
  "additional_number": "5678"
 },
 "collection_name": "Ahmed",
 "collection_email": "Ahmed@email.com",
 "collection_city": "Riyadh",
 "collection_address": "Al Sahafa",
 "collection_neighbourhood": "Riyadh",
 "collection_postcode": 11543,
 "collection_country": "SA",
 "collection_phone": 540000000,
 "collection_description": "",
 "collection_national_address": {
  "short_code": "EFGH5678",
  "building_number": "5678",
  "street_name": "Prince Sultan Road",
  "district": "Al Malaz",
  "city": "Riyadh",
  "post_code": "11564",
  "additional_number": "9012"
 },
 "weight": 38,
 "pieces": 1,
 "items_count": 1,
 "international_metadata": {
  "tax_identification_number": "id-123",
  "invoice_number": "inv-123",
  "invoice_date": "2025-05-22",
  "document_id": 1042
 }
}
```

### Response

#### Success Response
Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
 "success": true,
 "shipping": {
  "reference": null,
  "tracking_number": "AY2866494373",
  "customer_tracking": null,
  "customer_name": "test Account",
  "requested_by": "Test3",
  "price_set_amount": null,
  "price_set_amount_incl_tax": null,
  "tax_amount": null,
  "tax_rate": null,
  "cod_amount": 12,
  "declared_value": 1,
  "declared_value_currency": "SAR",
  "currency": "SAR",
  "delivery_name": "Ahmed",
  "delivery_email": "Ahmed@email.com",
  "delivery_city": "Riyadh",
  "delivery_address": "Riyadh",
  "delivery_neighbourhood": "Al Sahafa",
  "delivery_postcode": 11543,
  "delivery_country": "SA",
  "delivery_phone": 540000000,
  "delivery_description": null,
  "collection_name": "Ahmed",
  "collection_email": "Ahmed@email.com",
  "collection_city": "Riyadh",
  "collection_address": "Al Sahafa",
  "collection_region": null,
  "collection_postcode": 11543,
  "collection_country": "SA",
  "collection_phone": 540000000,
  "collection_description": null,
  "submission_date": "2021-12-15T12:09:41.915027Z",
  "pickup_date": null,
  "received_at": null,
  "delivery_date": null,
  "weight": 38,
  "pieces": 1,
  "items_count": 1,
  "status": "AWB created at origin",
  "status_label": "AWB created at origin",
  "created_at": "2021-12-15T12:09:41.000000Z",
  "is_reverse_pickup": 0,
  "label": "https://dev.aymakan.com.sa/pdf/generate/172aa74e-980f-4f80-930e-05f465e4cbbc",
  "pdf_label": "https://dev.aymakan.com.sa/pdf/generate/172aa74e-980f-4f80-930e-05f465e4cbbc"
 }
}
```

> The `label` and `pdf_label` provides full url to AWB download file in PDF format.

#### Error Response
In case of an error, the following response can be returned. The error response depends on the validation of request data, make sure all required data is entered correctly.

```json
{
 "message": "The given data was invalid.",
 "errors": {
  "price_set": [
   "The price set field is required."
  ],
  "declared_value": [
   "The declared value field is required."
  ]
 }
}
```

Also, an HTTP status of `422 Unprocessable Entity` will be returned.

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
 "error": true,
 "response": "Invalid Credentials"
}
```