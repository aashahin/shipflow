SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## getStatusByRef

Get Status of Shipment by Customer Reference Number

### Test

The test form is only available for requests from the local machine.

### SOAP 1.1

The following is a sample SOAP 1.1 request and response. The placeholders shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: length
SOAPAction: "http://track.smsaexpress.com/secom/getStatusByRef"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<getStatusByRef xmlns="http://track.smsaexpress.com/secom/">
<refNo>string</refNo>
<passkey>string</passkey>
</getStatusByRef>
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
<getStatusByRefResponse xmlns="http://track.smsaexpress.com/secom/">
<getStatusByRefResult>string</getStatusByRefResult>
</getStatusByRefResponse>
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
<getStatusByRef xmlns="http://track.smsaexpress.com/secom/">
<refNo>string</refNo>
<passkey>string</passkey>
</getStatusByRef>
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
<getStatusByRefResponse xmlns="http://track.smsaexpress.com/secom/">
<getStatusByRefResult>string</getStatusByRefResult>
</getStatusByRefResponse>
</soap12:Body>
</soap12:Envelope>
```