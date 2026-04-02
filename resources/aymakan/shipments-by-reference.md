# Fetch Shipment Using Reference
---
* [Introduction](/docs/aymakan-v2/shipments-by-reference#intro)
* [Request and Response](/docs/aymakan-v2/shipments-by-reference#endpoint-request)

## Introduction
This API enables customer to fetch their shipping using reference. It returns full shipment info including tracking info and AWB Url.

> Shipments without reference cannot be fetched using this API.

## Request and Response
This API only accepts `GET` requests.

### Development API End Point URL
https://dev-api.aymakan.com.sa/v2/shipping/by_reference/{referenceCodes}

### Production API End Point URL
https://api.aymakan.net/v2/shipping/by_reference/{referenceCodes}

> It is important to note that the reference numbers should be sent in a comma separated format. For example, `https://dev.aymakan.com.sa/api/v2/shipping/by_reference/123,1432,1234` while 123, 1432 and 1234 are references.

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
"reference": "200018179",
"tracking_number": "159694",
"customer_tracking": null,
"customer_name": "اختباري حساب",
"requested_by": "Test",
"cod_amount": "235.00",
"declared_value": "200.00",
"declared_value_currency": null,
"currency": "SAR",
"delivery_name": "Delivery Name ",
"delivery_email": "delivery@email.com",
"delivery_city": "Jeddah",
"delivery_address": "address info",
"delivery_region": null,
"delivery_neighbourhood": null,
"delivery_postcode": null,
"delivery_country": "SA",
"delivery_phone": "1231231231",
"delivery_description": " Delivery Description",
"collection_name": "Collection Point name",
"collection_email": "collection@email.com",
"collection_city": "Riyadh",
"collection_address": "Address",
"collection_region": null,
"collection_postcode": "NULL",
"collection_country": "SA",
"collection_phone": "12312312",
"collection_description": null,
"submission_date": "2017-11-27 18:46:47",
"pickup_date": "2017-11-27T15:46:47.000000Z",
"received_at": null,
"delivery_date": "2017-11-27T15:46:47.000000Z",
"weight": "1.00",
"pieces": 1,
"items_count": 1,
"status": "AY-0001",
"status_label": "Submitted",
"reason_en": null,
"reason_ar": null,
"created_at": "2017-11-27T15:46:47.000000Z",
"id_customer": 2,
"is_reverse_pickup": 0,
"awb_url": "http://localhost/pdf/generate/2425d2c5-2daf-11e9-87e0-024ac427d9e8",
"tracking_info": [
{
"status_code": "AY-0001",
"description": "Shipping Created",
"description_ar": null,
"created_at": "2017-11-27 18:46:47"
}
]
},
{
"reference": "200018179",
"tracking_number": "159693",
"customer_tracking": null,
"customer_name": "اختباري حساب",
"requested_by": "Test",
"cod_amount": "235.00",
"declared_value": "200.00",
"declared_value_currency": null,
"currency": "SAR",
"delivery_name": "Delivery Name ",
"delivery_email": "delivery@email.com",
"delivery_city": "Jeddah",
"delivery_address": "address info",
"delivery_region": null,
"delivery_neighbourhood": null,
"delivery_postcode": null,
"delivery_country": "SA",
"delivery_phone": "1231231231",
"delivery_description": " Delivery Description",
"collection_name": "Collection Point name",
"collection_email": "collection@email.com",
"collection_city": "Riyadh",
"collection_address": "Address",
"collection_region": null,
"collection_postcode": "NULL",
"collection_country": "SA",
"collection_phone": "12312312",
"collection_description": null,
"submission_date": "2017-11-27 18:40:03",
"pickup_date": "2017-11-27T15:40:03.000000Z",
"received_at": null,
"delivery_date": "2017-11-27T15:40:03.000000Z",
"weight": "1.00",
"pieces": 1,
"items_count": 1,
"status": "AY-0001",
"status_label": "Submitted",
"reason_en": null,
"reason_ar": null,
"created_at": "2017-11-27T15:40:03.000000Z",
"id_customer": 2,
"is_reverse_pickup": 0,
"awb_url": "http://localhost/pdf/generate/2425d257-2daf-11e9-87e0-024ac427d9e8",
"tracking_info": [
{
"status_code": "AY-0001",
"description": "Shipping Created",
"description_ar": null,
"created_at": "2017-11-27 18:40:03"
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
"message": "No Shipments Found"
}
```

Also, an HTTP status of `422 Unprocessable Entity` will be returned.

A `404 Not Found` HTTP status will be returned if no references are provided.

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
"error": true,
"response": "Invalid Credentials"
}
```