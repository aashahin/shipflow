SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## getRTLRetails

Get Retails list by each city

### Test

The test form is only available for requests from the local machine.

### SOAP 1.1

The following is a sample SOAP 1.1 request and response. The placeholders shown need to be replaced with actual values.

```http
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: length
SOAPAction: "http://track.smsaexpress.com/secom/getRTLRetails"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<getRTLRetails xmlns="http://track.smsaexpress.com/secom/">
<cityCode>string</cityCode>
<passkey>string</passkey>
</getRTLRetails>
</soap:Body>
</soap:Envelope>
```

```http
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: length
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<getRTLRetailsResponse xmlns="http://track.smsaexpress.com/secom/">
<getRTLRetailsResult>
<xsd:schema>schema</xsd:schema>xml</getRTLRetailsResult>
</getRTLRetailsResponse>
</soap:Body>
</soap:Envelope>
```

### SOAP 1.2

The following is a sample SOAP 1.2 request and response. The placeholders shown need to be replaced with actual values.

```http
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: application/soap+xml; charset=utf-8
Content-Length: length
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Body>
<getRTLRetails xmlns="http://track.smsaexpress.com/secom/">
<cityCode>string</cityCode>
<passkey>string</passkey>
</getRTLRetails>
</soap12:Body>
</soap12:Envelope>
```

```http
HTTP/1.1 200 OK
Content-Type: application/soap+xml; charset=utf-8
Content-Length: length
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Body>
<getRTLRetailsResponse xmlns="http://track.smsaexpress.com/secom/">
<getRTLRetailsResult>
<xsd:schema>schema</xsd:schema>xml</getRTLRetailsResult>
</getRTLRetailsResponse>
</soap12:Body>
</soap12:Envelope>
```