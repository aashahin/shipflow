# Delete Webhook API
***
* [Introduction](/docs/aymakan-v2/web-hooks-delete#intro)
* [Request and Response](/docs/aymakan-v2/web-hooks-delete#endpoint-request)

## Introduction
This API provides an interface to delete a webhook from customer account. 

## Request and Response
This API only accepts `DELETE` requests.

### Development API End Point URL
[https://dev-api.aymakan.com.sa/v2/webhooks/delete](https://dev-api.aymakan.com.sa/v2/webhooks/delete)

### Production API End Point URL
[https://api.aymakan.net/v2/webhooks/delete](https://api.aymakan.net/v2/webhooks/delete)

### Headers
The following headers should be sent along with the request
* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request
A simple `DELETE` request should be made to the above mentioned API End Point. Please note that the request should have the above mentioned two Headers. No request body is required.

> The webhook associated with the authenticated customer account will be deleted automatically.

### Response
##### Success Response
The following response will be returned upon success.

```json
{
"success": true,
"message": "WebHook is deleted successfully."
}
```

##### Error Response
In case the account does not have any webhook setup, the following error will be returned.

```json
{
"error": true,
"message": "WebHook not found."
}
```

Also, an HTTP status of `422 Unprocessable Entity` will be returned.

In case the webhook cannot be deleted due to a server error, the following response will be returned.

```json
{
"error": true,
"message": "WebHook can not be deleted at the moment, please try again later."
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