# Get Customer Address API
---

* [Introduction](/docs/aymakan-v2/customer-address-get#intro)
* [Request and Response](/docs/aymakan-v2/customer-address-get#endpoint-request)

## Introduction

This API provides an interface to fetch `ALL` addresses associated to customer account.

## Request and Response

This API only accepts `GET` requests.

### Development API End Point URL

[https://dev-api.aymakan.com.sa/v2/address/list](https://dev-api.aymakan.com.sa/v2/address/list)

### Production API End Point URL

[https://api.aymakan.net/v2/address/list](https://api.aymakan.net/v2/address/list)

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request

A simple `GET` request should be made to the above mentioned API End Point. Please note that the request should have the above mentioned two Headers.

### Response

##### Success Response

The following response will be returned upon success and if there are any address setup already at account.

```json
{
"success": true,
"data": {
"address": [
{
"id": 75,
"title": "mr",
"name": "Muh",
"email": "test@test.com",
"city": "Riyadh",
"address": "Saudi Arabia Makkah{Mecca} Jeddah Al Muntazahat شارع العام طريق الحرزات 03088",
"postcode": "75760",
"neighbourhood": "Al Wizarat",
"phone": "580000000",
"country": "SA",
"description": "Test User"
},
{
"id": 1003,
"title": "mr",
"name": "Muh",
"email": "test@test.com",
"city": "Riyadh",
"address": "Saudi Arabia Makkah{Mecca} Jeddah Al Muntazahat شارع العام طريق الحرزات 03088",
"postcode": "75760",
"neighbourhood": "Al Wizarat",
"phone": "580000000",
"country": "SA",
"description": "Test User"
}
]
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