# Delete Customer Address API
***
* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction
This API provides an interface to delete address at customer account.

## Request and Response
This API only accepts `DELETE` requests.

### Development API End Point URL
https://dev-api.aymakan.com.sa/v2/address/delete

### Production API End Point URL
https://api.aymakan.net/v2/address/delete

### Headers
The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request
Below is the list of parameters which should be sent to this API to delete a customer address.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | integer | Yes | Address ID |

A sample `DELETE` request body is below:

```json
{
"id":"2"
}
```

### Response

##### Success Response
The following response will be returned upon success.

```json
{
"success": true,
"message": "Record Delete Successfully"
}
```

##### Error Response
In case the `"id"` of the address entered in the request of the body is not linked to this current account, the following error will be returned.

Also, an HTTP status of `422 Unprocessable Entity` will be returned.

```json
{
"error": true,
"message": "Validation Error.",
"errors": {
"id": [
"The selected id is invalid."
]
}
}
```