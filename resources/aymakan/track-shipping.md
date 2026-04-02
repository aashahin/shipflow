# Track Shipping API
---

* [Introduction](/docs/aymakan-v2/track-shipping#intro)
* [Request and Response](/docs/aymakan-v2/track-shipping#endpoint-request)

## Introduction

This API enables customer to track their shipping. It returns full information and full statuses for each shippment provided in the request.

> This API can only track shipments which are associated with the account.

## Request and Response

This API only accepts `GET` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/shipping/track/{trackingIds}

### Production API End Point URL

https://api.aymakan.net/v2/shipping/track/{trackingIds}

> For multiple shipments it is important to note that the tracking numbers should be sent in comma separated format. For example, `https://dev.aymakan.com.sa/api/v2/shipping/track/123,1432,1234` while 123, 1432 and 1234 are tracking numbers

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Response

##### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"data": {
"shipments": [
{
"reference": "123",
"tracking_number": "206360",
"customer_tracking": null,
"customer_name": "اختباري حساب",
"requested_by": "Test",
"cod_amount": "1.00",
"declared_value": null,
"declared_value_currency": null,
"currency": "SAR",
"delivery_name": "Aymakan",
"delivery_email": null,
"delivery_city": "Jeddah",
"delivery_address": "Malaz",
"delivery_region": null,
"delivery_postcode": null,
"delivery_country": "SA",
"delivery_phone": "23234234",
"delivery_description": null,
"collection_name": "Aymakan",
"collection_email": null,
"collection_city": "Riyadh",
"collection_address": null,
"collection_region": null,
"collection_postcode": null,
"collection_country": "SA",
"collection_phone": "23423423",
"collection_description": null,
"submission_date": "2018-09-16 10:39:45",
"pickup_date": "2018-09-16T07:39:45.000000Z",
"received_at": null,
"delivery_date": "2018-09-16T07:39:45.000000Z",
"weight": "1.00",
"pieces": 1,
"items_count": 1,
"status": "Received at Warehouse",
"status_label": "Received at Warehouse",
"reason_en": null,
"reason_ar": null,
"created_at": "2018-09-16T07:39:45.000000Z",
"id_customer": 2,
"is_reverse_pickup": 0,
"tracking_info": [
{
"status_code": "AY-0003",
"description": "Shipment is received at Riyadh hub",
"description_ar": "أستلمت الشحنة في مركز الرياض لأعادة التوزيع ",
"created_at": "2019-01-23 20:25:16"
},
{
"status_code": "AY-0002",
"description": "Shipment was collected from collection point ",
"description_ar": "تم إستلام الشحنة من الشركة الشاحنة ",
"created_at": "2019-01-23 20:24:15"
},
{
"status_code": "AY-0001",
"description": "Shipping Created",
"description_ar": null,
"created_at": "2018-09-16 10:39:45"
}
]
}
]
}
}
```

##### Error Response

In case of an error, the following response can be returned.

```json
{
"error": true,
"message": "No shipments found",
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