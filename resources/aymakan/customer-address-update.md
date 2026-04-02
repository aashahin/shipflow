# Update Customer Address API
---
* [Introduction](/docs/aymakan-v2/customer-address-update#intro)
* [Request and Response](/docs/aymakan-v2/customer-address-update#endpoint-request)

## Introduction
This API provides an interface to update address linked to the customer account.

## Request and Response
This API only accepts `PUT` requests.

### Development API End Point URL
https://dev-api.aymakan.com.sa/v2/address/update

### Production API End Point URL
https://api.aymakan.net/v2/address/update

### Headers
The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request
Below is the list of parameters which should be sent to this API to update a customer address.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | string | Yes | Address ID |
| title | string | Yes | title |
| name | string | Yes | customer name |
| email | string | Yes | customer email |
| city | string | Yes | customer city |
| address | string | Yes | customer address |
| postcode | string | Yes | customer postcode |
| phone | string | Yes | customer phone number |
| description | string | Yes | description detail |
| neighbourhood | string | Yes | customer neighbourhood |

A sample `PUT` request body is below:

```json
{
"id": 1,
"title": "Aymkana",
"name": "test",
"email": "test@test.com",
"city": "Riyadh",
"address": "Saudi Arabia Makkah{Mecca} Jeddah Al Muntazahat شارع العام طريق الحرزات 03088",
"neighbourhood": "Al Wizarat",
"postcode": "75760",
"phone": "+966598998110",
"description": "Home address",
}
```

### Response

#### Success Response
The following response will be returned upon success.

```json
{
"success": true,
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
"description": "Home address",
"active": 1,
"created_at": "2019-02-07T08:53:21.000000Z",
"updated_at": "2021-08-29T08:27:50.000000Z"
}
}
}
```

#### Error Response
In case the account does not have any address setup, the following error will be returned. To avoid an error like this , make sure all required data is entered correctly.

```json
{
"error": true,
"message": "Validation Error.",
"errors": {
"id": [
"The id field is required."
],
"title": [
"The title field is required."
],
"name": [
"The name field is required."
],
"email": [
"The email field is required."
],
"city": [
"The city field is required."
],
"address": [
"The address field is required."
],
"neighbourhood": [
"The neighbourhood field is required."
],
"postcode": [
"The postcode field is required."
],
"phone": [
"The phone field is required."
],
"description": [
"The description field is required."
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