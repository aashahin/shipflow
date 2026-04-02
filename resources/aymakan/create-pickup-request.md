# Create Pickup Request
---
* [Introduction](#intro)
* [Request and Response](#endpoint-request)

## Introduction
This API creates a pickup request and links it to current customer.

## Request and Response
This API only accepts `POST` requests.

### Development API End Point URL
<https://dev-api.aymakan.com.sa/v2/pickup_request/create>

### Production API End Point URL
<https://api.aymakan.net/v2/pickup_request/create>

### Headers
The following headers should be sent along with the request
* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request
Below table list the request parameters which can be sent to Create Reverse Pickup API.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| reference | String | only if shipments = 1 | tracking number of the shipment to be picked up |
| pickup_date | String | Yes | Date format should be "Y-m-d" |
| time_slot | String | Yes | Time slot |
| city | String | Yes | A predefined pickup city name. Please check the [Pickup Cities API](pickup-cities). |
| contact_name | String | Yes | The customer's name |
| contact_phone | String | Yes | The customer's phone |
| address | String | Yes | The customer's address |
| shipments | Integer | Yes | Number of shipments to be picked up |

A sample `POST` request body is below with only the required data: 

```json
{
"reference": "AY463913512",
"pickup_date": "2023-12-24",
"time_slot": "morning",
"city": "Dammam",
"contact_name": "Test-999",
"contact_phone": "Test-999",
"address": "Test-999",
"shipments": 1
}
```

### Response

##### Success Response
Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"message": "Pickup request created successfully.",
"data": {
"customer_id": 2,
"contact_name": "Test-999",
"contact_phone": "Test-999",
"shipments": 1,
"time_slot": "morning",
"pickup_date": "2023-12-24",
"address": "Test-999",
"lat_long": ",",
"status": "pending",
"city": "Dammam",
"warehouse_id": 4,
"warehouse_name": "DMM-WH",
"reference": "AY463913512",
"updated_at": "2022-06-22T08:31:35.000000Z",
"created_at": "2022-06-22T08:31:35.000000Z",
"id": 1595
}
}
```

##### Error Response
In case of an error, the following response can be returned. The error response depends on the validation of request data, make sure all required data is entered correctly. Also, an HTTP status of `422 Unprocessable Entity` will be returned.

In case of an error, the following response will be returned. This means that the Maximum requests per customer daily has been passed .

```json
{
"error": true,
"message": {
"error": [
"You can not request any pickup as You already have pickup requests pending/processing. Cancel it and then request a new one."
]
}
}
```

This means that the time allowed on the same day PRs until (certain time) has been passed .

```json
{
"error": true,
"message": {
"error": [
"All slots are full for this day. Please select next available date."
]
}
}
```

The error below means that :
* The date entered is a past date , you have to enter a future date.
* The format of the date is invalid

```json
{
"error": true,
"message": {
"pickup_date": [
"The pickup date is not a valid date.",
"The pickup date must be a date after or equal to today.",
"The pickup date does not match the format Y-m-d."
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