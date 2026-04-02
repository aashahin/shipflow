# Cancel Shipping API
***

* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction

This API enables customer to cancel their shipping.

> This API can only cancel a shipment which has a status of Submitted (AY-0001).

## Request and Response

This API only accepts `POST` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/shipping/cancel

### Production API End Point URL

https://api.aymakan.net/v2/shipping/cancel

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request

The request body should have the tracking number of the shipment related to the customer account only as detailed below.

```json
{
"tracking": "AY66899292"
}
```

### Response

##### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"message": "Shipping is cancelled successfully"
}
```

##### Error Response

In case of an error, the following response can be returned.Usually because the status of the shipment is not (AY-0001).

```json
{
"error": true,
"message": "This shipping can not be cancelled"
}
```

If a shipment is not found, then the following error will be returned.

```json
{
"error": true,
"message": "Shipping not found"
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