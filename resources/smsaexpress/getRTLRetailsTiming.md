SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## getRTLRetailsTiming

Get Retails list by each city with Working Hours

### Test
The test form is only available for requests from the local machine.

### SOAP 1.1
The following is a sample SOAP 1.1 request and response. The placeholders shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: length
SOAPAction: "http://track.smsaexpress.com/secom/getRTLRetailsTiming"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getRTLRetailsTiming xmlns="http://track.smsaexpress.com/secom/">
      <cityCode>string</cityCode>
      <passkey>string</passkey>
    </getRTLRetailsTiming>
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
    <getRTLRetailsTimingResponse xmlns="http://track.smsaexpress.com/secom/">
      <getRTLRetailsTimingResult>
        <xsd:schema>schema</xsd:schema>xml
      </getRTLRetailsTimingResult>
    </getRTLRetailsTimingResponse>
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
    <getRTLRetailsTiming xmlns="http://track.smsaexpress.com/secom/">
      <cityCode>string</cityCode>
      <passkey>string</passkey>
    </getRTLRetailsTiming>
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
    <getRTLRetailsTimingResponse xmlns="http://track.smsaexpress.com/secom/">
      <getRTLRetailsTimingResult>
        <xsd:schema>schema</xsd:schema>xml
      </getRTLRetailsTimingResult>
    </getRTLRetailsTimingResponse>
  </soap12:Body>
</soap12:Envelope>
```