# Api Structure
---
* [Api End Points](#section-2)
* [Request Header](#section-3)
* [API Credentials](#api-credentials)
* [Requests and Responses](#reqs-resp)

## Api End Points

Aymakan provides API end points for both Development and Production systems. For initial development and testing please use the development API end point.

### Development API End Point URL

[https://dev-api.aymakan.com.sa/v2/](https://dev-api.aymakan.com.sa/v2/)

### Production API End Point URL

[https://api.aymakan.net/v2/](https://api.aymakan.net/v2/)

## Request Header

Aymakan API requires the following two headers.

| Header | Possible Value | Description |
| :--- | :--- | :--- |
| Accept | application/json | To get response in JSON format, this header should be passed with request with value application/json |
| Authorization | String | The security code / API key is available in customer account area, and you can get it from the path `customer account area -> Technical -> API`. Without the API key, API access is not allowed |

> To get a JSON response, it is required to pass `Accept` header with `application/json` value. If this header is not passed, you may get response in HTML format.

## API Credentials

Every user has a API Security Code. The security code should be always used in `Authorization` request header to access the API. To get your security code, login to your account, and then go to Integrations. There you will be find your API key. It is highly recommended to change API Key after a while or if your API key is compromised.

> if you regenerate the API key, you have to update it in your integration to access Aymakan API.

## Requests and Responses

Aymakan API is using RESTFul Json webservices. All Api requests should be made in json and expect all responses in json. A successful response will return an HTTP 200 Success status message, while any error will return an appropriate HTTP status message.

For example, a json request body can be formed as below:

```json
{
"requested_by": "aymakan-customer",
"collection_name": "Name of COllection",
... ... ...
}
```

Same as above request body, below is an example response.

```json
{
"success": true,
"data": {
"tracking_number": 123123,
... ... ...
}
}
```

> In case of a success response, a success element with value true will be also returned in the response. The respons element contains the actual data from the API request.