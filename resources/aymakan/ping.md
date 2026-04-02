# Ping API
***
* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## [Introduction](#introduction)
This endpoint provides general information about the current API status, environment, and whether the user is logged in or not.

## [Request and Response](#request-and-response)
This API only accepts `GET` requests.

### Development API End Point URL
https://dev-api.aymakan.com.sa/v2/ping

### Production API End Point URL
https://api.aymakan.net/v2/ping

### Headers
The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token` (optional)

### Response

##### Success Response
Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
 "status": "Healthy",
 "environment": "development",
 "logged_in": "Yes"
}
```

> The `environment` well be `production` for production API.

```json
{
 "status": "Healthy",
 "environment": "production",
 "logged_in": "Yes"
}
```

##### Error Response
In case of a **missing** `Authorization` header or **invalid/missing** `security code / Api Token` the following response can be returned:

```json
{
 "status": "Healthy",
 "environment": "production",
 "logged_in": "No"
}
```

> Make sure the **Authorization header** and the **secret code / Api Token** are entered correctly.