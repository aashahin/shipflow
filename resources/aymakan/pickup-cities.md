# Aymakan Pickup Cities API
---
* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction

This API provides an interface to fetch all cities where Pickup Requests are allowed.

## Request and Response

This API only accepts `GET` requests.

### Development API End Point URL

<https://dev-api.aymakan.com.sa/v2/pickup_request/cities>

### Production API End Point URL

<https://api.aymakan.net/v2/pickup_request/cities>

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
"cities": [
{
"city_en": "Riyadh",
"city_ar": "الرياض"
},
{
"city_en": "Khobar",
"city_ar": "الخبر"
},
...
...
]
}
}
```