# Update Webhook API
***
* [Introduction](#introduction)
* [Request and Response](#request-and-response)

## Introduction
This API provides an interface to update a webhook at customer account.

## Request and Response
This API only accepts `PUT` requests.

### Development API End Point URL
<https://dev-api.aymakan.com.sa/v2/webhooks/update>

### Production API End Point URL
<https://api.aymakan.net/v2/webhooks/update>

### Headers
The following headers should be sent along with the request

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request
Below is the list of parameters which should be sent to this API to update a webhook.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| webhook_url | string | Yes | A valid URL for the webhook |
| id | integer | Yes | webhook ID |
| authorization_key | string | No | Custom HTTP header name that will be sent when calling your webhook URL (e.g., "X-Custom-Auth") |
| authorization_value | string | No | Custom HTTP header value that will be sent with the authorization key when calling your webhook URL |

A sample `PUT` request body is below:

```json
{
"id": 195,
"webhook_url": "https://test-webhook-url.com"
}
```

A sample `PUT` request body **with updating authorization** is below:

```json
{
"id": 195,
"webhook_url": "https://test-webhook-url.com",
"authorization_key": "X-Custom-Auth",
"authorization_value": "your-secret-key-here"
}
```

### Response
##### Success Response
The following response will be returned upon success.

```json
{
"success": 1,
"data": {
"webhook": {
"id": 195,
"customer_id": 1234,
"webhook_url": "https://test-webhook-url.com",
"call_method": "POST",
"authorization_key": "X-Custom-Auth",
"authorization_value": "your-secret-key",
"active": 1,
"created_at": "2021-02-07T10:05:08.000000Z",
"updated_at": "2021-09-02T09:01:08.000000Z"
}
}
}
```

> The `authorization_key` and `authorization_value` fields will be `null` if not provided during the update. When provided, these credentials are stored and later sent as HTTP headers whenever AyMakan calls your webhook URL.

##### Error Response
In case the account does not have any webhook setup, the following error will be returned.

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