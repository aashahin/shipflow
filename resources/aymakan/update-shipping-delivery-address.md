# Update Shippings Delivery Address API
***

*   [Introduction](#introduction)
*   [Request and Response](#request-and-response)

## Introduction
This API provides the functionality of updating shipment delivery address.

## Request and Response
This API only accepts `POST` requests.

### Development API End Point URL
<https://dev-api.aymakan.com.sa/v2/shipping/update/delivery_address>

### Production API End Point URL
<https://api.aymakan.net/v2/shipping/update/delivery_address>

### Headers
The following headers should be sent along with the request

*   Accept: application/json
*   Authorization: `Your account security code / Api Token`

### Request
Below table list the request parameters which can be sent to Update Shipping API.

> The request parameters should be sent in request body using JSON format.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| tracking | String | Yes | Aymakan shipment tracking number to be updated |
| delivery_name | String | Yes | The delivery person name to whom that shipping will be delivered. |
| delivery_email | String | No | The delivery person email. It is optional, but if provided, then it should be valid email address. |
| delivery_city | String | Yes | A predefined city name. Please check the [Cities API](cities). A list of cities can be downloaded from here [Download AyMakan Cities](/cities) |
| delivery_address | String | Yes | Delivery address. |
| delivery_neighbourhood | String | No | City neighborhood for the delivery. |
| delivery_phone | Number | Yes | Delivery Phone Number. Only digits should be provided |

> You can only update shipments with status (AY-0001)/(AWB created at origin).

A sample `POST` request body is below with only the required data:

```json
{
"tracking": "AY2866566963",
"delivery_name": "Test update shpping",
"delivery_city": "DAMMAM",
"delivery_phone": "0599999999",
"delivery_address": "HI ALKUADRYAH"
}
```

### Response

##### Success Response
Upon successful request, the following response will be sent back with an HTTP status `200 OK`.

```json
{
"success": true,
"message": "Shipment delivery address is updated successfully.",
"shipping": {
"reference": null,
"tracking_number": "AY2866566963",
"customer_name": "test Account",
"requested_by": "Test",
"cod_amount": "0.00",
"declared_value": "1.00",
"currency": "SAR",
"delivery_name": "Test update shpping",
"delivery_email": "",
"delivery_city": "DAMMAM",
"delivery_address": "HI ALKUADRYAH",
"delivery_neighbourhood": null,
"delivery_postcode": null,
"delivery_country": "SA",
"delivery_phone": "0599999999",
"delivery_description": "81006877;81006873;81006869;",
"collection_name": "Ahmed",
"collection_email": null,
"collection_city": "DAMMAM",
"collection_address": "HI ALKUADRYAH",
"collection_postcode": null,
"collection_country": "SA",
"collection_phone": "567666565",
"collection_description": null,
"submission_date": "2022-03-28 10:51:39",
"pickup_date": null,
"received_at": null,
"delivery_date": null,
"weight": null,
"pieces": 1,
"items_count": 3,
"status": "AY-0001",
"status_label": "AWB created at origin",
"created_at": "2022-03-28T07:51:39.000000Z",
"is_reverse_pickup": 0,
"pdf_label": "https://aymakan.com.sa/pdf/generate/668b2be0-4a9e-4fa0-bfdf-5452f185c9c3"
}
}
```

##### Error Response
In case of an error, the following response can be returned. The error response depends on the status of the shipment.

```json
{
"error": true,
"message": "Shipment delivery address cannot be updated."
}
```

In case of wrong shipment tracking number, the following response will be returned.

```json
{
"error": true,
"message": "Shipment was not found."
}
```

In case of invalid credentials `401 Unauthorized`, the following response will be returned.

```json
{
"error": true,
"response": "Invalid Credentials"
}
```