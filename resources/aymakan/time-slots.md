# Time Slots
---

*   [Introduction](#introduction)
*   [Request and Response](#request-and-response)

## Introduction

This API fetches all time slots available to current customer.

## Request and Response

This API only accepts `GET` requests.

### Development API End Point URL

[https://dev-api.aymakan.com.sa/v2/time_slots/{pickupDate?}'
](https://dev-api.aymakan.com.sa/v2/time_slots/{pickupDate?}')

### Production API End Point URL

[https://api.aymakan.net/v2/time_slots/{pickupDate?}'
](https://api.aymakan.net/v2/time_slots/{pickupDate?}')

### Headers

The following headers should be sent along with the request

*   Accept: application/json
*   Authorization: `Your account security code / Api Token`

### Request

Below table list the request parameters which can be sent to Create Reverse Pickup API.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| pickup\_date | String | Yes | Date format should be "Y-m-d" |

### Response

#### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"data": {
"date": "2021-12-23",
"slots": {
"afternoon": "After Noon (02 PM - 06 PM)",
"evening": "Evening (06 PM - 09 PM)"
}
}
}
```

#### Error Response

The error below means that :

*   The date entered is a past date , you have to enter a future date.
*   The format of the date is invalid

```json
{
"error": true,
"message": "Validation Error",
"errors": {
"pickup_date": [
"The pickup date is not a valid date.",
"The pickup date must be a date after or equal to today.",
"The pickup date does not match the format Y-m-d."
]
}
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