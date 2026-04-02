## Steps for Registration

1. Create New Webhook Request.
2. Waiting For Approval.
3. After approval wait for a new scans under your account.
4. This is a sample request that your endpoint will receive.

### Request Sample

```bash
curl --location --request POST 'https://Endpoint...' \
--header 'Content-Type: application/json' \
--data-raw '[
    {
        "AWB": "231200021000",
        "Reference": "REF1234567890",
        "Pieces": 1,
        "CODAmount": 0.0,
        "ContentDesc": "Shipment contents description",
        "RecipientName": "Abdulaziz",
        "OriginCity": "Jeddah",
        "OriginCountry": "SA",
        "DesinationCity": "Riyadh",
        "DesinationCountry": "SA",
        "isDelivered": true, // Only in delivered Shipment
        "Scans": [
            {
                "ReferenceID": 10611,
                "ReceivedBy": "Abdulaziz", // Only in delivered Shipment
                "City": "Riyadh",
                "ScanType": "DL",
                "ScanDescription": "Delivered",
                "ScanDateTime": "2024-01-10T11:00:00",
                "ScanTimeZone": "+03:00"
            },
            {
                "ReferenceID": 10541,
                "City": "Riyadh",
                "ScanType": "OD",
                "ScanDescription": "Out for Delivery",
                "ScanDateTime": "2024-01-10T10:00:00",
                "ScanTimeZone": "+03:00"
            },
            {
                "ReferenceID": 10354,
                "City": "Jeddah",
                "ScanType": "AF",
                "ScanDescription": "Arrived Delivery Facility",
                "ScanDateTime": "2024-01-10T09:00:00",
                "ScanTimeZone": "+03:00"
            }
        ]
    },
    {
        "AWB": "231200022000",
        "Reference": "REF1234567890",
        "Pieces": 1,
        "CODAmount": 0.0,
        "ContentDesc": "Shipment contents description",
        "RecipientName": "Abdulaziz",
        "OriginCity": "Jeddah",
        "OriginCountry": "SA",
        "DesinationCity": "Riyadh",
        "DesinationCountry": "SA",
        "Scans": [
            {
                "ReferenceID": 10545,
                "City": "Riyadh",
                "ScanType": "OD",
                "ScanDescription": "Out for Delivery",
                "ScanDateTime": "2024-01-10T10:00:00",
                "ScanTimeZone": "+03:00"
            },
            {
                "ReferenceID": 10360,
                "City": "Jeddah",
                "ScanType": "AF",
                "ScanDescription": "Arrived Delivery Facility",
                "ScanDateTime": "2024-01-10T09:00:00",
                "ScanTimeZone": "+03:00"
            }
        ]
    }
]'
```

---

## Query Webhook For Latest Scans

1. When Get Activated your registration.
2. Generated API Key.
3. Type Your Request To Get Latest Scans After Webhook Registration.
4. Or add a scan reference Id to your request to get scans with reference Ids after it.

### Request Sample

```
GET /api/scans?key={API_Key}&referenceId={?reference}

Ex: /api/scans?key=xxxx&referenceId=xxxx
or: /api/scans?key=xxxx

Host: webhook.smsaexpress.com
```

### Response Sample

```json
[
  {
    "AWB": "231200021000",
    "Reference": "REF1234567890",
    "Pieces": 1,
    "CODAmount": 0.0,
    "ContentDesc": "Shipment contents description",
    "RecipientName": "Abdulaziz",
    "OriginCity": "Jeddah",
    "OriginCountry": "SA",
    "DesinationCity": "Riyadh",
    "DesinationCountry": "SA",
    "isDelivered": true,
    "Scans": [
      {
        "ReferenceID": 10611,
        "ReceivedBy": "Abdulaziz",
        "City": "Riyadh",
        "ScanType": "DL",
        "ScanDescription": "Delivered",
        "ScanDateTime": "2024-01-10T11:00:00",
        "ScanTimeZone": "+03:00"
      },
      {
        "ReferenceID": 10541,
        "City": "Riyadh",
        "ScanType": "OD",
        "ScanDescription": "Out for Delivery",
        "ScanDateTime": "2024-01-10T10:00:00",
        "ScanTimeZone": "+03:00"
      },
      {
        "ReferenceID": 10354,
        "City": "Jeddah",
        "ScanType": "AF",
        "ScanDescription": "Arrived Delivery Facility",
        "ScanDateTime": "2024-01-10T09:00:00",
        "ScanTimeZone": "+03:00"
      }
    ]
  },
  {
    "AWB": "231200022000",
    "Reference": "REF1234567890",
    "Pieces": 1,
    "CODAmount": 0.0,
    "ContentDesc": "Shipment contents description",
    "RecipientName": "Abdulaziz",
    "OriginCity": "Jeddah",
    "OriginCountry": "SA",
    "DesinationCity": "Riyadh",
    "DesinationCountry": "SA",
    "Scans": [
      {
        "ReferenceID": 10545,
        "City": "Riyadh",
        "ScanType": "OD",
        "ScanDescription": "Out for Delivery",
        "ScanDateTime": "2024-01-10T10:00:00",
        "ScanTimeZone": "+03:00"
      },
      {
        "ReferenceID": 10360,
        "City": "Jeddah",
        "ScanType": "AF",
        "ScanDescription": "Arrived Delivery Facility",
        "ScanDateTime": "2024-01-10T09:00:00",
        "ScanTimeZone": "+03:00"
      }
    ]
  }
]
```
