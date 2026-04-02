# Add Customer Address API
---

* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction

This API provides an interface to create an address and link it to customer account.

## Request and Response

This API only accepts `POST` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/address/create

### Production API End Point URL

https://api.aymakan.net/v2/address/create

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request

Below is the list of parameters which should be sent to this API to create customer address.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| title | string | Yes | title |
| name | string | Yes | customer name |
| email | string | Yes | customer email |
| city | string | Yes | customer city |
| address | string | Yes | customer address |
| neighbourhood | string | Yes | customer neighbourhood |
| postcode | string | Yes | customer postcode |
| phone | string | Yes | customer phone number |
| description | string | Yes | description detail |

A sample `POST` request body is below:

```json
{
"title": "Aymkana",
"name": "test",
"email": "test@test.com",
"city": "Riyadh",
"address": "Saudi Arabia Makkah{Mecca} Jeddah Al Muntazahat شارع العام طريق الحرزات 03088",
"neighbourhood": "Al Wizarat",
"postcode": "75760",
"phone": "+966598998110",
"description": "Home address"
}
```

### Response

#### Success Response

The following response will be returned upon success.

```json
{
"success": 1,
"data": {
"address": {
"id": 1,
"title": "Aymkana",
"name": "test",
"email": "test@test.com",
"city": "Riyadh",
"address": "Saudi Arabia Makkah{Mecca} Jeddah Al Muntazahat شارع العام طريق الحرزات 03088",
"postcode": "75760",
"neighbourhood": "Al Wizarat",
"phone": "+966598998110",
"country": "SA",
"description": "Home address"
}
}
}
```

#### Error Response

In case of any error, a standard validation error will be returned with `422` http status code. Below is a sample of error response. To avoid an error like this , make sure all required data is entered correctly.

```json
{
"error": true,
"message": "Validation Error.",
"errors": {
"title": [
"The title field is required."
]
}
}
```

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
"error": true,
"response": "Invalid Credentials"
}
```