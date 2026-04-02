# Customer Shipping
---
* [Introduction](docs/aymakan-v2/customer-shipping#intro)
* [Request and Response](docs/aymakan-v2/customer-shipping#endpoint-request)

## Introduction

This API is used to fetch a customer shipments created. It provides basic data like tracking number, reference, current status and last update date. Data is paginated. 

## Request and Response

This API only accepts `GET` requests.

### Development API End Point URL

<https://dev-api.aymakan.com.sa/v2/customer/shipments>

### Production API End Point URL

<https://api.aymakan.net/v2/customer/shipments>

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / API Token`

### Response

##### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

> This API returns 100 records per page. It is not changeable.

```json
{
"success": true,
"data": {
"current_page": 1,
"data": [
{
"tracking_number": "AY223307770",
"reference": "7102872",
"status": "Pickup Cancelled",
"updated_at": "2020-10-22 10:47:20"
},
{
"tracking_number": "AY189880804",
"reference": "6713971",
"status": "Pickup Cancelled",
"updated_at": "2020-10-07 14:12:43"
},
{
"tracking_number": "AY114460923",
"reference": "5589412",
"status": "Delivered",
"updated_at": "2020-09-16 04:53:24"
}
],
"first_page_url": "http://customers-api.test/api/customer/shipments?page=1",
"from": 1,
"last_page": 1,
"last_page_url": "http://customers-api.test/api/customer/shipments?page=1",
"next_page_url": null,
"path": "http://customers-api.test/api/customer/shipments",
"per_page": 100,
"prev_page_url": null,
"to": 3,
"total": 3
}
}
```

##### Error Response

In case of an error, the following response can be returned.

```json
{
"error": true,
"message": "No Shipment Found"
}
```

Also, an HTTP status of `422 Unprocessable Entity` will be returned.

A `404 Not Found` HTTP status will be returned if no tracking numbers are provided.

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
"error": true,
"response": "Invalid Credentials"
}
```