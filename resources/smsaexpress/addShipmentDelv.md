SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## addShipmentDelv
Create Shipment with Delivery Details and get SMSA AWB Number

### Test
The test form is only available for requests from the local machine.

### SOAP 1.1
The following is a sample SOAP 1.1 request and response. The *placeholders* shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: length
SOAPAction: "http://track.smsaexpress.com/secom/addShipmentDelv"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<addShipmentDelv xmlns="http://track.smsaexpress.com/secom/">
<passKey>string</passKey>
<refNo>string</refNo>
<sentDate>string</sentDate>
<idNo>string</idNo>
<cName>string</cName>
<cntry>string</cntry>
<cCity>string</cCity>
<cZip>string</cZip>
<cPOBox>string</cPOBox>
<cMobile>string</cMobile>
<cTel1>string</cTel1>
<cTel2>string</cTel2>
<cAddr1>string</cAddr1>
<cAddr2>string</cAddr2>
<shipType>string</shipType>
<PCs>int</PCs>
<cEmail>string</cEmail>
<carrValue>string</carrValue>
<carrCurr>string</carrCurr>
<codAmt>string</codAmt>
<weight>string</weight>
<custVal>string</custVal>
<custCurr>string</custCurr>
<insrAmt>string</insrAmt>
<insrCurr>string</insrCurr>
<itemDesc>string</itemDesc>
<prefDelvDate>string</prefDelvDate>
<gpsPoints>string</gpsPoints>
<ShortCode>string</ShortCode>
</addShipmentDelv>
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
<addShipmentDelvResponse xmlns="http://track.smsaexpress.com/secom/">
<addShipmentDelvResult>string</addShipmentDelvResult>
</addShipmentDelvResponse>
</soap:Body>
</soap:Envelope>
```

### SOAP 1.2
The following is a sample SOAP 1.2 request and response. The *placeholders* shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: application/soap+xml; charset=utf-8
Content-Length: length
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Body>
<addShipmentDelv xmlns="http://track.smsaexpress.com/secom/">
<passKey>string</passKey>
<refNo>string</refNo>
<sentDate>string</sentDate>
<idNo>string</idNo>
<cName>string</cName>
<cntry>string</cntry>
<cCity>string</cCity>
<cZip>string</cZip>
<cPOBox>string</cPOBox>
<cMobile>string</cMobile>
<cTel1>string</cTel1>
<cTel2>string</cTel2>
<cAddr1>string</cAddr1>
<cAddr2>string</cAddr2>
<shipType>string</shipType>
<PCs>int</PCs>
<cEmail>string</cEmail>
<carrValue>string</carrValue>
<carrCurr>string</carrCurr>
<codAmt>string</codAmt>
<weight>string</weight>
<custVal>string</custVal>
<custCurr>string</custCurr>
<insrAmt>string</insrAmt>
<insrCurr>string</insrCurr>
<itemDesc>string</itemDesc>
<prefDelvDate>string</prefDelvDate>
<gpsPoints>string</gpsPoints>
<ShortCode>string</ShortCode>
</addShipmentDelv>
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
<addShipmentDelvResponse xmlns="http://track.smsaexpress.com/secom/">
<addShipmentDelvResult>string</addShipmentDelvResult>
</addShipmentDelvResponse>
</soap12:Body>
</soap12:Envelope>
```