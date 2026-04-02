# Dropoff Locations API
---
* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction
This endpoint will return a list for AyMakan Warehouses locations.

## Request and Response
This API only accepts `GET` requests.

### Development API End Point URL
https://dev-api.aymakan.com.sa/v2/dropoff_locations

### Production API End Point URL
https://api.aymakan.net/v2/dropoff_locations

### Headers
The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Response

##### Success Response
Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
 "success": true,
 "data": [
  {
  "name": "RUH-WH",
  "city": "Riyadh",
  "address": "Sulay",
  "manager": "Ali ahmed",
  "mobile_phone": "05300000000",
  "email": "test@aymakan.com.sa",
  "location_lat": null,
  "location_lng": null
  },
  {
  "name": "ELQ-WH",
  "city": "Burydah",
  "address": "Qassim",
  "manager": "Jameel Abdulrahim",
  "mobile_phone": "0530000000",
  "email": "test@aymakan.com.sa",
  "location_lat": null,
  "location_lng": null
  }
 ]
}
```

##### Error Response
In case of a Wrong credentials, the following response can be returned:

```json
{
 "error": true,
 "message": "Invalid Credentials"
}
```