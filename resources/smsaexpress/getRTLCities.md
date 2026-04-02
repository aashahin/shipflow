SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## getRTLCities
Get List of Cities for Retails list

### Test
The test form is only available for requests from the local machine.

### SOAP 1.1
The following is a sample SOAP 1.1 request and response. The placeholders shown need to be replaced with actual values.

```http
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: length
SOAPAction: "http://track.smsaexpress.com/secom/getRTLCities"

<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getRTLCities xmlns="http://track.smsaexpress.com/secom/">
      <passkey>string</passkey>
    </getRTLCities>
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
    <getRTLCitiesResponse xmlns="http://track.smsaexpress.com/secom/">
      <getRTLCitiesResult>
        <xsd:schema>schema</xsd:schema>
        xml
      </getRTLCitiesResult>
    </getRTLCitiesResponse>
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
    <getRTLCities xmlns="http://track.smsaexpress.com/secom/">
      <passkey>string</passkey>
    </getRTLCities>
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
    <getRTLCitiesResponse xmlns="http://track.smsaexpress.com/secom/">
      <getRTLCitiesResult>
        <xsd:schema>schema</xsd:schema>
        xml
      </getRTLCitiesResult>
    </getRTLCitiesResponse>
  </soap12:Body>
</soap12:Envelope>
```