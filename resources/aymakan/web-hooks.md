# Web Hooks
***
* [Web Hooks](/docs/aymakan-v2/web-hooks#web-hooks)
    * [Introduction](/docs/aymakan-v2/web-hooks#introduction)
    * [Setup](/docs/aymakan-v2/web-hooks#setup)
    * [Setup Webhooks in Account Area](/docs/aymakan-v2/web-hooks#setup-webhooks-in-account-area)
    * [Request](/docs/aymakan-v2/web-hooks#request)
    * [Core Fields](/docs/aymakan-v2/web-hooks#core-fields)
    * [Reason Fields (for Not Delivered/Pending statuses)](/docs/aymakan-v2/web-hooks#reason-fields-for-not-deliveredpending-statuses)
    * [Delivery Information](/docs/aymakan-v2/web-hooks#delivery-information)
    * [Collection Information](/docs/aymakan-v2/web-hooks#collection-information)
    * [Shipment Details](/docs/aymakan-v2/web-hooks#shipment-details)
    * [Dates](/docs/aymakan-v2/web-hooks#dates)
    * [Additional Fields](/docs/aymakan-v2/web-hooks#additional-fields)
    * [Complete Example - Delivered Status](/docs/aymakan-v2/web-hooks#complete-example---delivered-status)
    * [Complete Example - Pending Status](/docs/aymakan-v2/web-hooks#complete-example---pending-status)
    * [Webhook Tester](/docs/aymakan-v2/web-hooks#webhook-tester)
    * [Success Response](/docs/aymakan-v2/web-hooks#success-response)
    * [Error Response](/docs/aymakan-v2/web-hooks#error-response)

## Introduction

Web Hooks are a convenient way to receive real time updates for your shipments as soon as a status is updated. Web Hooks can be used to update customer internal systems with the latest shipments statuses.

> The webhook URL call is scheduled as soon as the shipment status is updated in AyMakan system. The call may take from a few seconds to a few minutes.

## Setup

There are two possible ways to setup webhooks for an account.

*   Customer Area (Add / Update / Delete webhook)
*   APIs ([Add](/docs/aymakan-v2/web-hooks-add) / [Update](/docs/aymakan-v2/web-hooks-update) / [Get](/docs/aymakan-v2/web-hooks-get) / [Delete](/docs/aymakan-v2/web-hooks-delete))

### Setup Webhooks in Account Area

To setup Web Hook, login to your customer area. On left side menu, find `Integrations` and click on it. On next page, find `Webhooks` section.

There are several options to setup.

*   **Webhook URL**: The URL which will be called by AyMakan system whenever a shipment status is changed.
*   **Request Type**: The request type which AyMakan system will use to call `Webhook URL`. It should be always `POST`.
*   **Authorization Key** (Optional): Custom HTTP header name that will be sent when AyMakan calls your webhook URL (e.g., "X-Custom-Auth").
*   **Authorization Value** (Optional): Custom HTTP header value that will be sent with the authorization key when AyMakan calls your webhook URL.

> AyMakan is only responsible for calling the provided Web Hook URL. Security of that URL should be handled by your end.
>
> {info} If you provide authorization credentials, they will be sent as HTTP headers when AyMakan calls your webhook URL. This allows you to verify that webhook requests are coming from AyMakan.

## Request

When calling the Webhook URL, AyMakan sends a POST request with the following headers:

*   **Content-Type**: `application/json`
*   **Accept**: `application/json`
*   **<authorization_key>**: `<authorization-value>`

> The custom authorization header is only included if you have configured authorization credentials in your webhook settings. You provide these credentials when creating or updating your webhook, and AyMakan will send them as HTTP headers with every webhook request.

The request body includes comprehensive shipment data:

### Core Fields

*   **tracking\_number**: The tracking number of the shipment
*   **reference**: Customer-provided shipment reference
*   **status**: Status code (e.g., AY-0003, AY-0005)
*   **status\_label**: Human-readable status description
*   **date\_time**: Timestamp when the status was updated
*   **event**: Event type that triggered the webhook. Possible values:
    *   `status_update`: Default event when shipment status changes
    *   `weight_update`: Event triggered when shipment weight is updated

### Reason Fields (for Not Delivered/Pending statuses)

*   **reason\_code**: Reason code (e.g., AY-0048 for Future Delivery)
*   **reason\_en**: English description of the reason

### Delivery Information

*   **delivery\_name**: Recipient name
*   **delivery\_email**: Recipient email
*   **delivery\_city**: Delivery city
*   **delivery\_address**: Full delivery address
*   **delivery\_postcode**: Postal code
*   **delivery\_country**: Country code (e.g., "SA")
*   **delivery\_phone**: Recipient phone number
*   **delivery\_description**: Package description
*   **delivery\_neighbourhood**: Delivery neighbourhood
*   **requested\_delivery\_date**: Customer-requested delivery date

### Collection Information

*   **collection\_name**: Sender/collection point name
*   **collection\_email**: Sender email
*   **collection\_city**: Collection city
*   **collection\_address**: Collection address
*   **collection\_neighbourhood**: Collection neighbourhood

### Shipment Details

*   **pieces**: Number of pieces
*   **weight**: Shipment weight
*   **cod\_amount**: Cash on Delivery amount
*   **payment\_method**: Payment method (e.g., "Prepaid", "COD")
*   **is\_reverse\_pickup**: Boolean flag for reverse pickup

### Dates

*   **pickup\_date**: Date when shipment was picked up
*   **received\_at**: Date when shipment was received at warehouse
*   **delivery\_date**: Date when shipment was delivered

### Additional Fields

*   **id\_customer**: Customer ID
*   **customer\_name**: Customer account name
*   **tracking\_info**: Array of status history (see example below)

### Complete Example - Delivered Status

```json
{
"tracking_number": "AY4447538242",
"reference": "56325059",
"status": "AY-0005",
"status_label": "Delivered",
"reason_code": null,
"reason_en": null,
"date_time": "2023-01-08T15:41:26.000000Z",
"event": "status_update",
"requested_delivery_date": null,
"delivery_name": "عادل الخبراني",
"delivery_email": "adelk@gmail.com",
"delivery_city": "Riyadh",
"delivery_address": "شارع شارع رابغ، الحي الصحافة ،, عمارتين باللون الأزرق - بجانبها إستراحة,, الرياض, السعودية",
"delivery_postcode": null,
"delivery_country": "SA",
"delivery_phone": "+966551077641",
"delivery_description": "الأعشاب السبعة (1)",
"collection_name": "العجائب - ALAJAYEB",
"collection_email": "herbs77777@gmail.com",
"collection_city": "Riyadh",
"collection_address": "Istanbul Street,Al-Sulay District,17889, Riyadh - Al-Sulay District - Istanbul Street, Riyadh,السعودية",
"collection_neighbourhood": "Al-Sulay District",
"delivery_neighbourhood": "الصحافة",
"delivery_date": "2023-01-08T15:41:26.000000Z",
"is_reverse_pickup": 0,
"pickup_date": "2023-01-07T11:59:05.000000Z",
"received_at": "2023-01-07 15:58:18",
"cod_amount": "0.00",
"pieces": 1,
"id_customer": 2167,
"weight": "0.494",
"payment_method": "Prepaid",
"customer_name": "ALAJAYEB",
"tracking_info": [
{
"status_code": "AY-0005",
"description": "Shipment is delivered to customer - Received by عادل الخبراني",
"description_ar": "تم توصيل الشحنة - Received by عادل الخبراني",
"created_at": "2023-01-08 18:41:26"
},
{
"status_code": "AY-0004",
"description": "Shipment is out for its final destination.",
"description_ar": "الشحنة خارجة للتوصيل للوجة النهائية",
"created_at": "2023-01-08 12:51:08"
},
{
"status_code": "AY-0026",
"description": "Received at Riyadh Warehouse",
"description_ar": "Received at Riyadh Warehouse",
"created_at": "2023-01-07 15:58:18"
},
{
"status_code": "AY-0003",
"description": "Shipment is received at hub",
"description_ar": "أستلمت الشحنة في مركز التوزيع",
"created_at": "2023-01-07 15:58:18"
},
{
"status_code": "AY-0002",
"description": "Shipment was collected from collection point",
"description_ar": "تم إستلام الشحنة من الشركة الشاحنة",
"created_at": "2023-01-07 14:59:05"
},
{
"status_code": "AY-0001",
"description": "Shipment is created at collection point",
"description_ar": "تم إصدار بوليصة شحن لدى الشركة الشاحنة لكن لم تستلم من قبل \"أي مكان \"",
"created_at": "2023-01-07 13:52:24"
}
]
}
```

### Complete Example - Pending Status

```json
{
"tracking_number": "AY4335935224",
"reference": "56148320",
"status": "AY-0032",
"status_label": "Pending",
"reason_code": "AY-0048",
"reason_en": "Future Delivery",
"date_time": "2023-01-09T06:17:34.000000Z",
"event": "status_update",
"requested_delivery_date": null,
"delivery_name": "سلطان الحربي",
"delivery_email": "AA8785@hotmail.com",
"delivery_city": "Riyadh",
"delivery_address": "شارع خليفة بن حمد، الحي الجنادرية ،, حي الشروق الجنادربة,, الرياض, السعودية",
"delivery_postcode": null,
"delivery_country": "SA",
"delivery_phone": "+966533792102",
"delivery_description": "الأعشاب السبعة (1)",
"collection_name": "العجائب - ALAJAYEB",
"collection_email": "herbs77777@gmail.com",
"collection_city": "Riyadh",
"collection_address": "Istanbul Street,Al-Sulay District,17889, Riyadh - Al-Sulay District - Istanbul Street, Riyadh,السعودية",
"collection_neighbourhood": "Al-Sulay District",
"delivery_neighbourhood": "الجنادرية",
"delivery_date": null,
"is_reverse_pickup": 0,
"pickup_date": "2023-01-07T11:59:06.000000Z",
"received_at": "2023-01-07 15:58:16",
"cod_amount": "177.98",
"pieces": 1,
"id_customer": 2167,
"weight": "0.494",
"payment_method": null,
"customer_name": "ALAJAYEB",
"tracking_info": [
{
"status_code": "AY-0032",
"description": "Shipment is pending - Future Delivery",
"description_ar": "الشحنة معلقة - مؤجل",
"created_at": "2023-01-09 09:17:34"
},
{
"status_code": "AY-0026",
"description": "Received at Riyadh Warehouse - Delayed",
"description_ar": "Received at Riyadh Warehouse - تأجيل",
"created_at": "2023-01-08 23:43:05"
},
{
"status_code": "AY-0006",
"description": "Shipment was not delivered. - shipment delivery was delayed by customer",
"description_ar": "تمت المحاولة لتوصيل الشحنة ، لم يتم توصيل الشحنة - تم تأجيل موعد إستلام الشحنة من قبل العميل",
"created_at": "2023-01-08 22:07:26"
},
{
"status_code": "AY-0004",
"description": "Shipment is out for its final destination.",
"description_ar": "الشحنة خارجة للتوصيل للوجة النهائية",
"created_at": "2023-01-08 12:36:31"
},
{
"status_code": "AY-0026",
"description": "Received at Riyadh Warehouse",
"description_ar": "Received at Riyadh Warehouse",
"created_at": "2023-01-07 15:58:16"
},
{
"status_code": "AY-0003",
"description": "Shipment is received at hub",
"description_ar": "أستلمت الشحنة في مركز التوزيع",
"created_at": "2023-01-07 15:58:16"
},
{
"status_code": "AY-0002",
"description": "Shipment was collected from collection point",
"description_ar": "تم إستلام الشحنة من الشركة الشاحنة",
"created_at": "2023-01-07 14:59:06"
},
{
"status_code": "AY-0001",
"description": "Shipment is created at collection point",
"description_ar": "تم إصدار بوليصة شحن لدى الشركة الشاحنة لكن لم تستلم من قبل \"أي مكان \"",
"created_at": "2023-01-07 08:49:44"
}
]
}
```

***

> The Webhook URL endpoint must be implemented by customers to receive and process webhook notifications.

## Webhook Tester

You can test your webhook through our [Webhook Tester](/webhook_tester) to verify the response and check if your webhook integration is working properly.

You will need to enter the `Webhook url`,`Tracking Number`,`Reference Number`,`Status`(Shipment status) , if the shipment status is `Not Delivered` you will be required to select a reason as to why the shipment wasn't delivered.

> All inputs are required.

### Success Response

A success message will say `Data sent successfully`.

### Error Response

In case of an error, the following response can be returned. `Error: Request failed with status code 404` meaning that the webhook url is not found.