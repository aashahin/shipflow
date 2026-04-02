# Cancel Pickup Requests
---

*   [Introduction](/docs/aymakan-v2/cancel-pickup-request#intro)
*   [Request and Response](/docs/aymakan-v2/cancel-pickup-request#endpoint-request)

## Introduction

This API enables customer to cancel their pickup requests.

> This API can only cancel a pickup request which has a status of **Pending** or **Processing**.

## Request and Response

This API only accepts `POST` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/pickup_request/cancel

### Production API End Point URL

https://api.aymakan.net/v2/pickup_request/cancel

### Headers

The following headers should be sent along with the request

*   Accept: application/json
*   Authorization: `Your account security code / Api Token`

### Request

Below table list the request parameters which can be sent to Create Reverse Pickup API.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| pickup_request | Integer | Yes | Pickup request id |

A sample `POST` request body is below with only the required data:

```json
{
"pickup_request": 4021
}
```

### Response

##### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"message": "Pickup Request is cancelled successfully"
}
```

##### Error Response

In case of an already cancelled pickup request, the following response will be returned along with an HTTP status of `422 Unprocessable Entity`.

```json
{
"error": true,
"message": "This pickup request is already cancelled"
}
```

If a pickup request is not found, then the following error will be returned.

```json
{
"error": true,
"message": "Pickup Request was not found"
}
```

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
"error": true,
"response": "Invalid Credentials"
}
```