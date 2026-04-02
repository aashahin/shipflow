# Get Webhooks API

---

* [Introduction](/docs/aymakan-v2/web-hooks-get#intro)
* [Request and Response](/docs/aymakan-v2/web-hooks-get#endpoint-request)

## Introduction

This API provides an interface to fetch webhook associated to customer account.

## Request and Response

This API only accepts `GET` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/webhooks/list

### Production API End Point URL

https://api.aymakan.net/v2/webhooks/list

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request

A simple `GET` request should be made to the above mentioned API End Point. Please note that the request should have the above mentioned two Headers.

### Response

##### Success Response

The following response will be returned upon success and if there are any webhooks setup already at account.

```json
{
"success": 1,
"data": {
"webhook": {
"id": 195,
"customer_id": 1234,
"webhook_url": "https://testings.com",
"call_method": "POST",
"authorization_key": "X-Custom-Auth",
"authorization_value": "your-secret-key",
"active": 1,
"created_at": "2021-02-07T10:05:08.000000Z",
"updated_at": "2021-02-07T10:40:34.000000Z"
}
}
}
```

> The `authorization_key` and `authorization_value` fields will be `null` if not configured for this webhook. When configured, these credentials are sent as HTTP headers whenever AyMakan calls your webhook URL.

##### Error Response

In case of an error, the following response can be returned. This error usually means that there is no existing webhook linked to customer account.

```json
{
"error": true,
"message": "WebHook not found."
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