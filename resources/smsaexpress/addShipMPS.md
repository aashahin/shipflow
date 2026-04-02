SMSAWebService

Click [here](SMSAwebService.asmx) for a complete list of operations.

## addShipMPS
Create Shipment with Shipper Details and get SMSA AWB Number for Multi piece Shipments

### Test
The test form is only available for requests from the local machine.

### SOAP 1.1
The following is a sample SOAP 1.1 request and response. The placeholders shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: text/xml; charset=utf-8
Content-Length: <font>length</font>
SOAPAction: "http://track.smsaexpress.com/secom/addShipMPS"
&lt;?xml version="1.0" encoding="utf-8"?&gt;
&lt;soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"&gt;
&lt;soap:Body&gt;
&lt;addShipMPS xmlns="http://track.smsaexpress.com/secom/"&gt;
&lt;passKey&gt;<font>string</font>&lt;/passKey&gt;
&lt;refNo&gt;<font>string</font>&lt;/refNo&gt;
&lt;sentDate&gt;<font>string</font>&lt;/sentDate&gt;
&lt;idNo&gt;<font>string</font>&lt;/idNo&gt;
&lt;cName&gt;<font>string</font>&lt;/cName&gt;
&lt;cntry&gt;<font>string</font>&lt;/cntry&gt;
&lt;cCity&gt;<font>string</font>&lt;/cCity&gt;
&lt;cZip&gt;<font>string</font>&lt;/cZip&gt;
&lt;cPOBox&gt;<font>string</font>&lt;/cPOBox&gt;
&lt;cMobile&gt;<font>string</font>&lt;/cMobile&gt;
&lt;cTel1&gt;<font>string</font>&lt;/cTel1&gt;
&lt;cTel2&gt;<font>string</font>&lt;/cTel2&gt;
&lt;cAddr1&gt;<font>string</font>&lt;/cAddr1&gt;
&lt;cAddr2&gt;<font>string</font>&lt;/cAddr2&gt;
&lt;shipType&gt;<font>string</font>&lt;/shipType&gt;
&lt;PCs&gt;<font>int</font>&lt;/PCs&gt;
&lt;cEmail&gt;<font>string</font>&lt;/cEmail&gt;
&lt;carrValue&gt;<font>string</font>&lt;/carrValue&gt;
&lt;carrCurr&gt;<font>string</font>&lt;/carrCurr&gt;
&lt;codAmt&gt;<font>string</font>&lt;/codAmt&gt;
&lt;weight&gt;<font>string</font>&lt;/weight&gt;
&lt;custVal&gt;<font>string</font>&lt;/custVal&gt;
&lt;custCurr&gt;<font>string</font>&lt;/custCurr&gt;
&lt;insrAmt&gt;<font>string</font>&lt;/insrAmt&gt;
&lt;insrCurr&gt;<font>string</font>&lt;/insrCurr&gt;
&lt;itemDesc&gt;<font>string</font>&lt;/itemDesc&gt;
&lt;sName&gt;<font>string</font>&lt;/sName&gt;
&lt;sContact&gt;<font>string</font>&lt;/sContact&gt;
&lt;sAddr1&gt;<font>string</font>&lt;/sAddr1&gt;
&lt;sAddr2&gt;<font>string</font>&lt;/sAddr2&gt;
&lt;sCity&gt;<font>string</font>&lt;/sCity&gt;
&lt;sPhone&gt;<font>string</font>&lt;/sPhone&gt;
&lt;sCntry&gt;<font>string</font>&lt;/sCntry&gt;
&lt;prefDelvDate&gt;<font>string</font>&lt;/prefDelvDate&gt;
&lt;gpsPoints&gt;<font>string</font>&lt;/gpsPoints&gt;
&lt;ShortCode&gt;<font>string</font>&lt;/ShortCode&gt;
&lt;/addShipMPS&gt;
&lt;/soap:Body&gt;
&lt;/soap:Envelope&gt;
```

```xml
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: <font>length</font>
&lt;?xml version="1.0" encoding="utf-8"?&gt;
&lt;soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"&gt;
&lt;soap:Body&gt;
&lt;addShipMPSResponse xmlns="http://track.smsaexpress.com/secom/"&gt;
&lt;addShipMPSResult&gt;<font>string</font>&lt;/addShipMPSResult&gt;
&lt;/addShipMPSResponse&gt;
&lt;/soap:Body&gt;
&lt;/soap:Envelope&gt;
```

### SOAP 1.2
The following is a sample SOAP 1.2 request and response. The placeholders shown need to be replaced with actual values.

```xml
POST /SECOM/SMSAwebService.asmx HTTP/1.1
Host: track.smsaexpress.com
Content-Type: application/soap+xml; charset=utf-8
Content-Length: <font>length</font>
&lt;?xml version="1.0" encoding="utf-8"?&gt;
&lt;soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"&gt;
&lt;soap12:Body&gt;
&lt;addShipMPS xmlns="http://track.smsaexpress.com/secom/"&gt;
&lt;passKey&gt;<font>string</font>&lt;/passKey&gt;
&lt;refNo&gt;<font>string</font>&lt;/refNo&gt;
&lt;sentDate&gt;<font>string</font>&lt;/sentDate&gt;
&lt;idNo&gt;<font>string</font>&lt;/idNo&gt;
&lt;cName&gt;<font>string</font>&lt;/cName&gt;
&lt;cntry&gt;<font>string</font>&lt;/cntry&gt;
&lt;cCity&gt;<font>string</font>&lt;/cCity&gt;
&lt;cZip&gt;<font>string</font>&lt;/cZip&gt;
&lt;cPOBox&gt;<font>string</font>&lt;/cPOBox&gt;
&lt;cMobile&gt;<font>string</font>&lt;/cMobile&gt;
&lt;cTel1&gt;<font>string</font>&lt;/cTel1&gt;
&lt;cTel2&gt;<font>string</font>&lt;/cTel2&gt;
&lt;cAddr1&gt;<font>string</font>&lt;/cAddr1&gt;
&lt;cAddr2&gt;<font>string</font>&lt;/cAddr2&gt;
&lt;shipType&gt;<font>string</font>&lt;/shipType&gt;
&lt;PCs&gt;<font>int</font>&lt;/PCs&gt;
&lt;cEmail&gt;<font>string</font>&lt;/cEmail&gt;
&lt;carrValue&gt;<font>string</font>&lt;/carrValue&gt;
&lt;carrCurr&gt;<font>string</font>&lt;/carrCurr&gt;
&lt;codAmt&gt;<font>string</font>&lt;/codAmt&gt;
&lt;weight&gt;<font>string</font>&lt;/weight&gt;
&lt;custVal&gt;<font>string</font>&lt;/custVal&gt;
&lt;custCurr&gt;<font>string</font>&lt;/custCurr&gt;
&lt;insrAmt&gt;<font>string</font>&lt;/insrAmt&gt;
&lt;insrCurr&gt;<font>string</font>&lt;/insrCurr&gt;
&lt;itemDesc&gt;<font>string</font>&lt;/itemDesc&gt;
&lt;sName&gt;<font>string</font>&lt;/sName&gt;
&lt;sContact&gt;<font>string</font>&lt;/sContact&gt;
&lt;sAddr1&gt;<font>string</font>&lt;/sAddr1&gt;
&lt;sAddr2&gt;<font>string</font>&lt;/sAddr2&gt;
&lt;sCity&gt;<font>string</font>&lt;/sCity&gt;
&lt;sPhone&gt;<font>string</font>&lt;/sPhone&gt;
&lt;sCntry&gt;<font>string</font>&lt;/sCntry&gt;
&lt;prefDelvDate&gt;<font>string</font>&lt;/prefDelvDate&gt;
&lt;gpsPoints&gt;<font>string</font>&lt;/gpsPoints&gt;
&lt;ShortCode&gt;<font>string</font>&lt;/ShortCode&gt;
&lt;/addShipMPS&gt;
&lt;/soap12:Body&gt;
&lt;/soap12:Envelope&gt;
```

```xml
HTTP/1.1 200 OK
Content-Type: application/soap+xml; charset=utf-8
Content-Length: <font>length</font>
&lt;?xml version="1.0" encoding="utf-8"?&gt;
&lt;soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"&gt;
&lt;soap12:Body&gt;
&lt;addShipMPSResponse xmlns="http://track.smsaexpress.com/secom/"&gt;
&lt;addShipMPSResult&gt;<font>string</font>&lt;/addShipMPSResult&gt;
&lt;/addShipMPSResponse&gt;
&lt;/soap12:Body&gt;
&lt;/soap12:Envelope&gt;
```