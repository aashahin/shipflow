# Shipping AWB label printing API
***

* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction
This API can be used to print single AWB. This API requires tracking number associated with a customer account. If the tracking number is found for that associated account, a URL will be returned to download the pdf file for AWB.

## Request and Response
This API only accepts `GET` requests.

### Development API End Point URL
[https://dev-api.aymakan.com.sa/v2/shipping/awb/tracking/{trackingNumber}](https://dev-api.aymakan.com.sa/v2/shipping/awb/tracking/{trackingNumber})

### Production API End Point URL
[https://api.aymakan.net/v2/shipping/awb/tracking/{trackingNumber}](https://api.aymakan.net/v2/shipping/awb/tracking/{trackingNumber})

> The `{trackingNumber}` should be replaced by shipment tracking number.

### Headers
The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Response

> Shipments status must be **'AY-0001'** (AWB created at origin), otherwise the AWB link will not be returned.

##### Success Response
Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"data": {
"awb_url": "https://dev.aymakan.com.sa/pdf/generate/f05891c7-6f86-4e59-bd3f-4484a6321309"
}
}
```

##### Error Response
In case of an error, the following response can be returned.

```json
{
"error": true,
"message": "Not found"
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