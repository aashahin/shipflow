SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## addShipPDF

Create Shipment with Shipper Details and get SMSA AWB Number with PDF Label

### Test

The test form is only available for requests from the local machine.

### SOAP 1.1

The following is a sample SOAP 1.1 request and response. The *placeholders* shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: <font>length</font>
SOAPAction: "http://track.smsaexpress.com/secom/addShipPDF"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<addShipPDF xmlns="http://track.smsaexpress.com/secom/">
<passKey><font>string</font></passKey>
<refNo><font>string</font></refNo>
<sentDate><font>string</font></sentDate>
<idNo><font>string</font></idNo>
<cName><font>string</font></cName>
<cntry><font>string</font></cntry>
<cCity><font>string</font></cCity>
<cZip><font>string</font></cZip>
<cPOBox><font>string</font></cPOBox>
<cMobile><font>string</font></cMobile>
<cTel1><font>string</font></cTel1>
<cTel2><font>string</font></cTel2>
<cAddr1><font>string</font></cAddr1>
<cAddr2><font>string</font></cAddr2>
<shipType><font>string</font></shipType>
<PCs><font>int</font></PCs>
<cEmail><font>string</font></cEmail>
<carrValue><font>string</font></carrValue>
<carrCurr><font>string</font></carrCurr>
<codAmt><font>string</font></codAmt>
<weight><font>string</font></weight>
<custVal><font>string</font></custVal>
<custCurr><font>string</font></custCurr>
<insrAmt><font>string</font></insrAmt>
<insrCurr><font>string</font></insrCurr>
<itemDesc><font>string</font></itemDesc>
<sName><font>string</font></sName>
<sContact><font>string</font></sContact>
<sAddr1><font>string</font></sAddr1>
<sAddr2><font>string</font></sAddr2>
<sCity><font>string</font></sCity>
<sPhone><font>string</font></sPhone>
<sCntry><font>string</font></sCntry>
<prefDelvDate><font>string</font></prefDelvDate>
<gpsPoints><font>string</font></gpsPoints>
<vatValue><font>string</font></vatValue>
<harmCode><font>string</font></harmCode>
<ShortCode><font>string</font></ShortCode>
</addShipPDF>
</soap:Body>
</soap:Envelope>
```

```xml
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: <font>length</font>
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<addShipPDFResponse xmlns="http://track.smsaexpress.com/secom/">
<addShipPDFResult>
<Response><font>string</font></Response>
<aPDF><font>base64Binary</font></aPDF>
</addShipPDFResult>
</addShipPDFResponse>
</soap:Body>
</soap:Envelope>
```

### SOAP 1.2

The following is a sample SOAP 1.2 request and response. The *placeholders* shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: application/soap+xml; charset=utf-8
Content-Length: <font>length</font>
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Body>
<addShipPDF xmlns="http://track.smsaexpress.com/secom/">
<passKey><font>string</font></passKey>
<refNo><font>string</font></refNo>
<sentDate><font>string</font></sentDate>
<idNo><font>string</font></idNo>
<cName><font>string</font></cName>
<cntry><font>string</font></cntry>
<cCity><font>string</font></cCity>
<cZip><font>string</font></cZip>
<cPOBox><font>string</font></cPOBox>
<cMobile><font>string</font></cMobile>
<cTel1><font>string</font></cTel1>
<cTel2><font>string</font></cTel2>
<cAddr1><font>string</font></cAddr1>
<cAddr2><font>string</font></cAddr2>
<shipType><font>string</font></shipType>
<PCs><font>int</font></PCs>
<cEmail><font>string</font></cEmail>
<carrValue><font>string</font></carrValue>
<carrCurr><font>string</font></carrCurr>
<codAmt><font>string</font></codAmt>
<weight><font>string</font></weight>
<custVal><font>string</font></custVal>
<custCurr><font>string</font></custCurr>
<insrAmt><font>string</font></insrAmt>
<insrCurr><font>string</font></insrCurr>
<itemDesc><font>string</font></itemDesc>
<sName><font>string</font></sName>
<sContact><font>string</font></sContact>
<sAddr1><font>string</font></sAddr1>
<sAddr2><font>string</font></sAddr2>
<sCity><font>string</font></sCity>
<sPhone><font>string</font></sPhone>
<sCntry><font>string</font></sCntry>
<prefDelvDate><font>string</font></prefDelvDate>
<gpsPoints><font>string</font></gpsPoints>
<vatValue><font>string</font></vatValue>
<harmCode><font>string</font></harmCode>
<ShortCode><font>string</font></ShortCode>
</addShipPDF>
</soap12:Body>
</soap12:Envelope>
```

```xml
HTTP/1.1 200 OK
Content-Type: application/soap+xml; charset=utf-8
Content-Length: <font>length</font>
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Body>
<addShipPDFResponse xmlns="http://track.smsaexpress.com/secom/">
<addShipPDFResult>
<Response><font>string</font></Response>
<aPDF><font>base64Binary</font></aPDF>
</addShipPDFResult>
</addShipPDFResponse>
</soap12:Body>
</soap12:Envelope>
```