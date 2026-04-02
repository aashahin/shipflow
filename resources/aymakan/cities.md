# Aymakan Cities API
---
* [Introduction](/docs/aymakan-v2/cities#intro)
* [Request and Response](/docs/aymakan-v2/cities#endpoint-request)

## Introduction
This API provides an interface to fetch all cities where AyMakan ship. This is a public API and does not require API token.

Also, the complete list of cities can be downloaded by clicking on below link.

[Download AyMakan Cities](/cities)

## Request and Response
This API only accepts `GET` requests.

### Development API End Point URL
https://dev-api.aymakan.com.sa/v2/cities

### Production API End Point URL
https://api.aymakan.net/v2/cities

### Headers
The following headers should be sent along with the request
* Accept: application/json

### Response

##### Success Response
Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"data": {
"cities": [
{
"city_en": "Riyadh",
"city_ar": "الرياض"
},
{
"city_en": "Khobar",
"city_ar": "الخبر"
},
...
...
]
}
}
```