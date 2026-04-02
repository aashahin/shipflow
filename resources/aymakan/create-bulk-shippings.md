# Create Bulk Shippings API
---

* [Introduction](/docs/aymakan-v2/create-bulk-shippings#intro)
* [Request and Response](/docs/aymakan-v2/create-bulk-shippings#endpoint-request)

## Introduction

This API provides an interface to create a new bulk shipments at Aymakan.

## Request and Response

This API only accepts `POST` requests.

### Development API End Point URL

[https://dev-api.aymakan.com.sa/v2/shipping/create/bulk_shipping](https://dev-api.aymakan.com.sa/v2/shipping/create/bulk_shipping)

### Production API End Point URL

[https://api.aymakan.net/v2/shipping/create/bulk_shipping](https://api.aymakan.net/v2/shipping/create/bulk_shipping)

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request

Below table list the request parameters which can be sent to Shipping Create API.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
|---|---|---|---|
| shipments | Array | Yes | An array containing shipments |

> You cannot create more than 30 at a time.

A sample `POST` request body is below with only the required data:

```json
{
 "shipments": [
  {
   "requested_by": "Test create bulk shipment 1",
   "delivery_name": "delivery",
   "declared_value": "1",
   "delivery_city": "Riyadh",
   "delivery_address": "Riyadh",
   "delivery_neighbourhood": "Riyadh",
   "delivery_country": "SA",
   "delivery_phone": "0599999999",
   "collection_name": "abdullah",
   "collection_email": "test@test.com",
   "collection_city": "Riyadh",
   "collection_address": "Riyadh",
   "collection_country": "SA",
   "collection_phone": "0599999999",
   "pieces": 1
  },
  {
   "requested_by": "Test create bulk shipment 2",
   "delivery_name": "delivery",
   "declared_value": "1",
   "delivery_city": "Riyadh",
   "delivery_address": "Riyadh",
   "delivery_neighbourhood": "Riyadh",
   "delivery_country": "SA",
   "delivery_phone": "0599999999",
   "collection_name": "abdullah",
   "collection_email": "test@test.com",
   "collection_city": "Riyadh",
   "collection_address": "Riyadh",
   "collection_country": "SA",
   "collection_phone": "0599999999",
   "pieces": 1
  },
  {
   "requested_by": "Test create bulk shipment 3",
   "delivery_name": "delivery",
   "declared_value": "1",
   "delivery_city": "Riyadh",
   "delivery_address": "Riyadh",
   "delivery_neighbourhood": "Riyadh",
   "delivery_country": "SA",
   "delivery_phone": "0599999999",
   "collection_name": "abdullah",
   "collection_email": "test@test.com",
   "collection_city": "Riyadh",
   "collection_address": "Riyadh",
   "collection_country": "SA",
   "collection_phone": "0599999999",
   "pieces": 1
  }
 ]
}
```

### Response

##### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
 "success": true,
 "message": "Bulk shipments are created successfully",
 "bulk_awb": "https://aymakan.com.sa/pdf/bulk_label/key/82ec7120-c8c5-476c-8245-a425cd97c026",
 "total_shipments": 3,
 "shipments": [
  {
   "reference": null,
   "tracking_number": "AY2866675509",
   "customer_name": "test Account",
   "requested_by": "Test create bulk shipment 1",
   "cod_amount": 0,
   "declared_value": "1",
   "currency": null,
   "delivery_name": "delivery",
   "delivery_email": null,
   "delivery_city": "Riyadh",
   "delivery_address": "Riyadh",
   "delivery_neighbourhood": "Riyadh",
   "delivery_postcode": null,
   "delivery_country": "SA",
   "delivery_phone": "0599999999",
   "delivery_description": null,
   "collection_name": "abdullah",
   "collection_email": "test@test.com",
   "collection_city": "Riyadh",
   "collection_address": "Riyadh",
   "collection_postcode": null,
   "collection_country": "SA",
   "collection_phone": "0599999999",
   "collection_description": null,
   "submission_date": "2022-03-06T08:11:34.852478Z",
   "pickup_date": null,
   "received_at": null,
   "delivery_date": null,
   "weight": null,
   "pieces": 1,
   "items_count": null,
   "status": "AY-0001",
   "status_label": "AWB created at origin",
   "created_at": "2022-03-06T08:11:34.000000Z",
   "is_reverse_pickup": 0,
   "pdf_label": "https://aymakan.com.sa/pdf/generate/ef38e3bc-f302-4fa1-b92a-c68108bf496b"
  },
  {
   "reference": null,
   "tracking_number": "AY2866676891",
   "customer_name": "test Account",
   "...": "...",
   "...": "..."
  },
  {
   "reference": null,
   "tracking_number": "AY2866677874",
   "customer_name": "test Account",
   "...": "...",
   "...": "..."
  }
 ]
}
```

> You can choose between the `bulk_awb` for group AWB or `pdf_label` for each single shipments and download them in PDF format.

##### Error Response

In case of an error, the following response can be returned. The error response depends on the validation of request data, make sure all required data is entered correctly.

```json
{
 "error": true,
 "message": "The given data was invalid",
 "errors": [
  {
   "errors": {
    "delivery_name": [
     "The delivery name field is required."
    ]
   },
   "reference": null,
   "data": {
    "requested_by": "Test create bulk shipment 1",
    "declared_value": "1",
    "delivery_city": "Riyadh",
    "delivery_address": "Riyadh",
    "delivery_neighbourhood": "Riyadh",
    "delivery_country": "SA",
    "delivery_phone": "0599999999",
    "collection_name": "abdullah",
    "collection_email": "test@test.com",
    "collection_city": "Riyadh",
    "collection_address": "Riyadh",
    "collection_country": "SA",
    "collection_phone": "0599999999",
    "pieces": 1
   }
  },
  {
   "errors": {
    "delivery_phone": [
     "The delivery phone field is required."
    ]
   },
   "reference": null,
   "data": {
    "requested_by": "Test create bulk shipment 2",
    "delivery_name": "delivery",
    "declared_value": "1",
    "delivery_city": "Riyadh",
    "delivery_address": "Riyadh",
    "delivery_neighbourhood": "Riyadh",
    "delivery_country": "SA",
    "collection_name": "abdullah",
    "collection_email": "test@test.com",
    "collection_city": "Riyadh",
    "collection_address": "Riyadh",
    "collection_country": "SA",
    "collection_phone": "0599999999",
    "pieces": 1
   }
  }
 ]
}
```

In case of exceeding the limited number of shipments, the following response will be returned.

```json
{
 "error": true,
 "message": "Only 30 shipments can be created at a time."
}
```

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
 "error": true,
 "response": "Invalid Credentials"
}
```