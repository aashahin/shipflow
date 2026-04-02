# Login API
***

* [Introduction](/docs/aymakan-v2/login#intro)
* [Request and Response](/docs/aymakan-v2/login#endpoint-request)

## Introduction
This endpoint provides login functionality. it will return api token with basic user info.

## Request and Response
This API only accepts `POST` requests.

### Development API End Point URL
[https://dev-api.aymakan.com.sa/v2/login](https://dev-api.aymakan.com.sa/v2/login)

### Production API End Point URL
[https://api.aymakan.net/v2/login](https://api.aymakan.net/v2/login)

### Headers
The following headers should be sent along with the request

* Accept: application/json

### Request
The request body should have the email address and the password related to the customer account as shown below.

```json
{
"email": "<Your email address>",
"password": "<Your password>"
}
```

### Response

##### Success Response
Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"user_data": {
"id": 2,
"api_token": "9825ff836d606c93a9c04f1g5h6j4dr5-bcccffa2-286e-46ca-9bb4-3fe11894d072-4b9fad0c4c2eae8ae6940faeb6c5a0a0/123da90252d9d44f33ba3e5bfdba8253/af197dea-bbcb-4509-9455-dc564b8f04d5",
"name": "Test Account",
"balance": "0.0000",
"phone": "059999999",
"collection_addresses": [
{
"id": 632,
"title": "mr",
"name": "Ali",
"email": "ali@example.com",
"city": "Riyadh",
"address": "123",
"postcode": "11534",
"neighbourhood": "Rabiea",
"phone": "580771524",
"country": "SA",
"description": "Test User"
}
]
}
}
```

##### Error Response
In case of a Wrong credentials, the following response can be returned:

```json
{
"error": true,
"message": "Incorrect email or password"
}
```

In case of an inactive account, the following response can be returned:

```json
{
"error": true,
"message": "Your account is not active. Please contact the sales team."
}
```