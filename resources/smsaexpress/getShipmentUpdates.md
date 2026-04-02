# SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## getShipmentUpdates

Get All the Shipment Updates for the customer shipments

### Test

The test form is only available for requests from the local machine.

### SOAP 1.1

The following is a sample SOAP 1.1 request and response. The placeholders shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: length
SOAPAction: "http://track.smsaexpress.com/secom/getShipmentUpdates"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<getShipmentUpdates xmlns="http://track.smsaexpress.com/secom/">
<rowId>int</rowId>
<passKey>string</passKey>
</getShipmentUpdates>
</soap:Body>
</soap:Envelope>
```

```xml
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: length
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<getShipmentUpdatesResponse xmlns="http://track.smsaexpress.com/secom/">
<getShipmentUpdatesResult>
<RequestStatus>string</RequestStatus>
<ShipUpdatesList>
<ShipUpdates>
<rowId>string</rowId>
<awbNo>string</awbNo>
<evtDate>string</evtDate>
<Activity>string</Activity>
<Details>string</Details>
<Location>string</Location>
</ShipUpdates>
<ShipUpdates>
<rowId>string</rowId>
<awbNo>string</awbNo>
<evtDate>string</evtDate>
<Activity>string</Activity>
<Details>string</Details>
<Location>string</Location>
</ShipUpdates>
</ShipUpdatesList>
</getShipmentUpdatesResult>
</getShipmentUpdatesResponse>
</soap:Body>
</soap:Envelope>
```

### SOAP 1.2

The following is a sample SOAP 1.2 request and response. The placeholders shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: application/soap+xml; charset=utf-8
Content-Length: length
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Body>
<getShipmentUpdates xmlns="http://track.smsaexpress.com/secom/">
<rowId>int</rowId>
<passKey>string</passKey>
</getShipmentUpdates>
</soap12:Body>
</soap12:Envelope>
```

```xml
HTTP/1.1 200 OK
Content-Type: application/soap+xml; charset=utf-8
Content-Length: length
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Body>
<getShipmentUpdatesResponse xmlns="http://track.smsaexpress.com/secom/">
<getShipmentUpdatesResult>
<RequestStatus>string</RequestStatus>
<ShipUpdatesList>
<ShipUpdates>
<rowId>string</rowId>
<awbNo>string</awbNo>
<evtDate>string</evtDate>
<Activity>string</Activity>
<Details>string</Details>
<Location>string</Location>
</ShipUpdates>
<ShipUpdates>
<rowId>string</rowId>
<awbNo>string</awbNo>
<evtDate>string</evtDate>
<Activity>string</Activity>
<Details>string</Details>
<Location>string</Location>
</ShipUpdates>
</ShipUpdatesList>
</getShipmentUpdatesResult>
</getShipmentUpdatesResponse>
</soap12:Body>
</soap12:Envelope>
```