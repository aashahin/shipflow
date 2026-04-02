# Paperless Document Upload API
---
* [Introduction](#intro)
* [Request and Response](#endpoint-request)

## Introduction
Use this API to upload paperless documents (e.g., commercial invoices) for international shipments. The API returns a `document_id` that can be referenced in `internationalMetadata.document_id` when creating a shipment.

## Request and Response
This API only accepts `POST` requests.

### Development API End Point URL
https://dev-api.aymakan.com.sa/v2/shipping/documents/upload

### Production API End Point URL
https://api.aymakan.net/v2/shipping/documents/upload

### Headers
Send the following headers with the request:

* Accept: application/json
* Authorization: `Your account security code / Api Token`

### Request

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| document | String | Yes | Base64-encoded file content. Data URI prefix is supported (e.g., `data:application/pdf;base64,....`). |
| document_type | String | Yes | One of: `pdf`, `image`, `jpg`, `jpeg`, `png`. |
| reference | String | No | Optional reference to associate with the document. |

> Maximum file size depends on your plan and limits on the API gateway. Prefer optimized PDFs or images.

Sample `POST` body:

```json
{
"document": "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp...",
"document_type": "pdf",
"reference": "INV-12345"
}
```

### Response

On success (`200 OK`):

```json
{
"success": true,
"message": "Document uploaded successfully",
"data": {
"document_id": 1042,
"reference": "INV-12345",
"document_type": "pdf",
"storage_url": "https://s3.aws.com/bucket/paperless-documents/abc.pdf",
"created_at": "2025-10-30T12:34:56.000000Z"
}
}
```

On validation error (`422 Unprocessable Entity`):

```json
{
"error": true,
"message": "Validation failed",
"errors": {
"document": [
"The document field is required."
]
}
}
```

On server error (`500 Internal Server Error`):

```json
{
"error": true,
"message": "Failed to upload document",
"details": "<error details>"
}
```

> After uploading, use the returned `data.document_id` in `internationalMetadata.document_id` when calling Create Shipping for international services (`IPX`, `EPX`).