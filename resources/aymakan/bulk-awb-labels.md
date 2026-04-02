# Bulk AWB label printing API
---

*   [Introduction](/docs/aymakan-v2/bulk-awb-labels#intro)
*   [Request and Response](/docs/aymakan-v2/bulk-awb-labels#endpoint-request)

## Introduction

This API provides an interface to print multiple AWB at once. This API requires a list of comma separated tracking numbers associated with a customer account. If all the tracking numbers are found for that associated account, this API returns a URL to download the pdf file for all AWB.

## Request and Response

This API only accepts `GET` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/shipping/bulk_awb/trackings/{trackingNumber

### Production API End Point URL

https://api.aymakan.net/v2/shipping/bulk_awb/trackings/{trackingNumber

> It is important to note that the tracking numbers should be sent in command separated format as can be seen above.

### Headers

The following headers should be sent along with the request

*   Accept: application/json
*   Authorization: `Your account security code / Api Token`

### Request

The request body should have only one parameter as details below.

```json
{
"tracking_codes": "123,124"
}
```

### Response

> Shipments status must be **'AY-0001'** (AWB created at origin), otherwise the AWB link will not be returned.

##### Success Response

Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"data": {
"bulk_awb_url": "https://dev.aymakan.com.sa/pdf/generate/f05891c7-6f86-4e59-bd3f-4484a6321309"
}
}
```

> The `bulk_awb_url` will be full URL based on Development or Production environment you are using.

##### Error Response

In case of an error, the following response can be returned.

```json
{
"error": true,
"message": "No shipments found",
"errors": {
"trackings": [
"123",
"124",
"145",
"100",
"2334",
"4325",
"143",
"543"
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