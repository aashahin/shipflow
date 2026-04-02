# Add Webhook API
***

* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction

This API provides an interface to create a webhook at customer account. If a webhook is already available, then an error will be returned.

## Request and Response

This API only accepts `POST` requests.

### Development API End Point URL

https://dev-api.aymakan.com.sa/v2/webhooks/create

### Production API End Point URL

https://api.aymakan.net/v2/webhooks/create

### Headers

The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request

Below is the list of parameters which should be sent to this API to create a webhook.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| webhook\_url | string | Yes | A valid URL for the webhook |
| authorization\_key | string | No | Custom HTTP header name that will be sent when calling your webhook URL (e.g., "X-Custom-Auth") |
| authorization\_value | string | No | Custom HTTP header value that will be sent with the authorization key when calling your webhook URL |

A sample `POST` request body is below:

```json
{
"webhook_url": "https://testings.com"
}
```

A sample `POST` request body **with authorization** is below:

```json
{
"webhook_url": "https://testings.com",
"authorization_key": "X-Custom-Auth",
"authorization_value": "your-secret-key-here"
}
```

> If you provide authorization credentials during webhook creation, AyMakan will send them as HTTP headers when calling your webhook URL. This allows you to verify the authenticity of webhook requests from AyMakan.

### Response

#### Success Response

The following response will be returned upon success.

```json
{
"success": 1,
"webhook": {
"id": 196,
"customer_id": 1234,
"webhook_url": "https://webhook.com",
"call_method": "POST",
"authorization_key": "X-Custom-Auth",
"authorization_value": "your-secret-key",
"active": 1,
"created_at": "2021-09-02T08:34:51.000000Z",
"updated_at": "2021-09-02T08:34:51.000000Z"
}
}
```

> The `authorization_key` and `authorization_value` fields will be `null` if not provided during webhook creation. When provided, these credentials are stored and later sent as HTTP header whenever AyMakan calls your webhook URL, allowing you to secure your webhook endpoint.

#### Error Response

In case of any error, a standard validation error will be returned with `422` http status code. This error shows up if there is already a webhook linked to customer account. Below is a sample of error response.

```json
{
"error": true,
"message": "There are some errors.",
"errors": "You already have webhook. Please fetch your webhook if you want to update it."
}
```

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
"error": true,
"response": "Invalid Credentials"
}
```