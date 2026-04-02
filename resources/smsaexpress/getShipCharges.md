SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## getShipCharges

Get Shipment Charges

### Test
The test form is only available for requests from the local machine.

### SOAP 1.1
The following is a sample SOAP 1.1 request and response. The placeholders shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: length
SOAPAction: "http://track.smsaexpress.com/secom/getShipCharges"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<getShipCharges xmlns="http://track.smsaexpress.com/secom/">
<passKey>string</passKey>
<shipCity>string</shipCity>
<shipCntry>string</shipCntry>
<destCity>string</destCity>
<destCntry>string</destCntry>
<shipType>string</shipType>
<codAmt>double</codAmt>
<weight>double</weight>
</getShipCharges>
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
<getShipChargesResponse xmlns="http://track.smsaexpress.com/secom/">
<getShipChargesResult>
<RequestStatus>string</RequestStatus>
<ShipCharges>string</ShipCharges>
<ShipChargesCurr>string</ShipChargesCurr>
</getShipChargesResult>
</getShipChargesResponse>
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
<getShipCharges xmlns="http://track.smsaexpress.com/secom/">
<passKey>string</passKey>
<shipCity>string</shipCity>
<shipCntry>string</shipCntry>
<destCity>string</destCity>
<destCntry>string</destCntry>
<shipType>string</shipType>
<codAmt>double</codAmt>
<weight>double</weight>
</getShipCharges>
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
<getShipChargesResponse xmlns="http://track.smsaexpress.com/secom/">
<getShipChargesResult>
<RequestStatus>string</RequestStatus>
<ShipCharges>string</ShipCharges>
<ShipChargesCurr>string</ShipChargesCurr>
</getShipChargesResult>
</getShipChargesResponse>
</soap12:Body>
</soap12:Envelope>
```