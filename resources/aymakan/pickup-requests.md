# Pickup Requests
---

* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction

This API fetches all current customer pickup requests.

## Request and Response

This API only accepts `GET` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/pickup_request/list

### Production API End Point URL

https://api.aymakan.net/v2/pickup_request/list

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

##### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"data": {
"pickupRequests": {
"current_page": 1,
"data": [
{
"id": 3573,
"customer_id": 2,
"contact_name": "test Account",
"contact_phone": "598998110",
"address": "123, Riyadh",
"lat_long": null,
"shipments": 4,
"time_slot": "morning",
"pickup_date": "2021-07-14",
"driver_id": null,
"dispatcher_id": null,
"status": "cancelled",
"reason_id": null,
"created_at": "2021-07-11T03:25:51.000000Z",
"updated_at": "2021-07-11T03:26:22.000000Z"
},
{
"id": 3572,
"customer_id": 2,
"contact_name": "test Account",
"contact_phone": "598998110",
"address": "123, Riyadh",
"lat_long": null,
"shipments": 4,
"time_slot": "morning",
"pickup_date": "2021-07-11",
"driver_id": null,
"dispatcher_id": null,
"status": "cancelled",
"reason_id": null,
"created_at": "2021-07-11T03:25:08.000000Z",
"updated_at": "2021-07-11T03:25:16.000000Z"
},
{
"id": 2604,
"customer_id": 2,
"contact_name": "test Account",
"contact_phone": "598998110",
"address": "Hara",
"lat_long": ",",
"shipments": 5,
"time_slot": "03pm",
"pickup_date": "2021-04-14",
"driver_id": null,
"dispatcher_id": null,
"status": "cancelled",
"reason_id": null,
"created_at": "2021-04-04T08:25:51.000000Z",
"updated_at": "2021-04-04T10:25:09.000000Z"
},
{
"id": 1572,
"customer_id": 2,
"contact_name": "test Account",
"contact_phone": "598998110",
"address": "6061 Al Ulaya, Al Wurud, Riyadh 12251 2832, Saudi Arabia",
"lat_long": "24.7141515,46.6753732",
"shipments": 10,
"time_slot": "04pm",
"pickup_date": "2020-12-12",
"driver_id": 202,
"dispatcher_id": null,
"status": "completed",
"reason_id": null,
"created_at": "2020-12-10T12:15:35.000000Z",
"updated_at": "2020-12-31T09:03:29.000000Z"
},
{
"id": 1,
"customer_id": 2,
"contact_name": "Test by Altaf",
"contact_phone": "598998110",
"address": "2370 Abdullah Al Adawi, As Sali, Riyadh 14265 7461, Saudi Arabia",
"lat_long": "24.6748983,46.8305797",
"shipments": 6,
"time_slot": "03pm",
"pickup_date": "2020-02-16",
"driver_id": 202,
"dispatcher_id": null,
"status": "cancelled",
"reason_id": 1,
"created_at": "2020-02-16T07:22:09.000000Z",
"updated_at": "2020-12-10T12:14:48.000000Z"
}
],
"first_page_url": "http://customers-api.test/api/pickup_request/list?page=1",
"from": 1,
"last_page": 1,
"last_page_url": "http://customers-api.test/api/pickup_request/list?page=1",
"links": [
{
"url": null,
"label": "&laquo; Previous",
"active": false
},
{
"url": "http://customers-api.test/api/pickup_request/list?page=1",
"label": "1",
"active": true
},
{
"url": null,
"label": "Next &raquo;",
"active": false
}
],
"next_page_url": null,
"path": "http://customers-api.test/api/pickup_request/list",
"per_page": 20,
"prev_page_url": null,
"to": 5,
"total": 5
}
}
}
```

##### Error Response

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
"error": true,
"response": "Invalid Credentials"
}
```