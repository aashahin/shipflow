# Create Reverse Pickup Shipping API
---
* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction

This API provides an interface to create a new reverse pickup shipment at Aymakan.

> Only allowed customers can create reverse pickup shipment

## Request and Response

This API only accepts `POST` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/shipping/create/reverse_pickup

### Production API End Point URL

https://api.aymakan.net/v2/shipping/create/reverse_pickup

### Headers

The following headers should be sent along with the request

*   Accept: application/json
*   Authorization: `Your account security code / Api Token`

### Request

Below table list the request parameters which can be sent to Shipping Create API.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| requested_by | String | Yes | The name of the person who is creating the shipping. It can be the employee name who is responsible for it |
| declared_value | Decimal | Yes | The amount of the order. This value is not visible on the shipping label. |
| declared_value_currency | String | No | The declared value currency. Default to SAR if no other currency is provided. Possible values are SAR, USD, AED. This value is not visible on the shipping label. |
| reference | AlphaNumeric | No | The order reference if available. It should be unique. If the reference number is already used a validation error will be returned `The reference has already been taken` |
| is_cod | Numeric (Bool) | No | If order is cash on delivery, set to 1. Default is 0. |
| cod_amount | Decimal | Conditional | If is_cod is 1, then required, else optional. The COD amount which needs to be collected. |
| currency | String | No | The currency of the amount. Default to SAR. |
| delivery_name | String | Yes | The delivery person name to whom that shipping will be delivered. |
| delivery_email | String | No | The delivery person email. It is optional, but if provided, then it should be valid email address. |
| delivery_city | String | Yes | A predefined city name. Please check the [Cities API](cities). A list of cities can be downloaded from here [Download AyMakan Cities](/cities) |
| delivery_address | String | Yes | Delivery address. |
| delivery_neighbourhood | String | Yes | City neighborhood for the delivery. |
| delivery_postcode | String | No | Delivery Post code |
| delivery_country | String | Yes | ISO Code for the country. Default to `SA` for Saudi Arabia |
| delivery_phone | Number | Yes | Delivery Phone Number. Only digits should be provided |
| delivery_description | String | No | Any specific delivery description for that shipping |
| collection_name | String | Yes | The main collection or entity or business name who is creating the shipping |
| collection_email | String | No | The collection email |
| collection_city | String | Yes | A predefined city name. Please check the [Cities API](cities). A list of cities can be downloaded from here [Download AyMakan Cities](/cities) |
| collection_address | String | Yes | Collection point address, from where the shipping will be collected |
| collection_neighbourhood | String | No | City neighborhood for the Collection. |
| collection_postcode | String | No | Collection point post code |
| collection_country | String | Yes | ISO Code for the country. Default to `SA` for Saudi Arabia |
| collection_phone | Number | Yes | Collection phone number. Phone number should be all numbers |
| collection_description | String | No | Any description for the collection of the shipping. |
| weight | Decimal | No | The weight of the shipment |
| pieces | Integer | Yes | The total number of pieces that single shipping will have. For example, some shipping will have more items, which can’t be enclosed in a single packaging, so it is possible to pack them in multiple cartons. Those number of cartons means pieces here. |
| items_count | Integer | No | The total number of physical items in the shipment |
| products | Array | Yes | An array of the products including their `sku`,`qty` and `price` |

> To be compatible with future API updates and releases, Please use the cities in the Cities API. As of now, Aymakan is not validating the city in the API requests, but it soon it will be implemented.

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
"collection_name": "Ahmed",
"collection_email": "Ahmed@email.com",
"collection_city": "Riyadh",
"collection_address": "Al Sahafa",
"collection_neighbourhood": "Riyadh",
"collection_postcode": 11543,
"collection_country": "SA",
"collection_phone": 540000000,
"collection_description": "",
"weight": 38,
"pieces": 1,
"items_count": 1,
"products": [
{
"sku": 1212,
"qty": 1,
"price":34
},
{
"sku": 1212,
"qty": 1,
"price":34
}
]
}
```

> The request parameters should be sent in request body using JSON format.

### Response

##### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"data": {
"shipping": {
"reference": null,
"tracking_number": "RP47082146",
"customer_tracking": null,
"customer_name": null,
"requested_by": "Test3",
"price_set_amount": null,
"price_set_amount_incl_tax": null,
"tax_amount": null,
"tax_rate": null,
"cod_amount": 0,
"declared_value": 1,
"declared_value_currency": "SAR",
"currency": "SAR",
"delivery_name": "Ahmed",
"delivery_email": "Ahmed@email.com",
"delivery_city": "Riyadh",
"delivery_address": "Riyadh",
"delivery_region": null,
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
"submission_date": "2021-10-03T08:24:22.206338Z",
"pickup_date": null,
"received_at": null,
"delivery_date": null,
"weight": 38,
"pieces": 1,
"items_count": 1,
"status": "AWB created at origin",
"status_label": null,
"reason_en": null,
"reason_ar": null,
"created_at": "2021-10-03T08:24:22.000000Z",
"is_reverse_pickup": 1,
"label": "http://localhost/pdf/generate/daad6184-e15c-4e91-a859-913ce888f42c",
"pdf_label": "http://localhost/pdf/generate/daad6184-e15c-4e91-a859-913ce888f42c"
}
}
}
```

> The reverse shipping tracking number starts with the prefix `RP`

##### Error Response

If the customer is `not allowed` to create reverse pickup shipment this error will be returned.

```json
{
"error": true,
"message": "The given data was invalid.",
"errors": {
"rp": [
"You are not allowed to create RP shipments. Contact sales team."
]
}
}
```

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