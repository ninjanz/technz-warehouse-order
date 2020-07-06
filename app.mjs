
import express from 'express';
import bodyParser from 'body-parser';

import { qbo, createInvoice, updateToken } from "./qbo_funcs.mjs";

import tel from './telegram_funcs.js';

// setup express with body-parser
var app = express()
app.use(bodyParser.json());

const port = process.env.PORT || 3000

// deploy test
app.get('/', (req, res) => {
  res.send("hellow world!")
})

// qbo token test
app.get('/company', (req, res) => {
  qbo.findCompanyInfos().then(data => { res.send(data); })
  .catch((err) => { console.log(err) });
})

// create invoice using this route
app.post('/create-invoice', function (req, res) {
  updateToken()
  .then(createInvoice(req.body))
  .catch((err) => { res.send(err); console.log(err); })
})

app.get('/send-doc', async (req, res) => {
  try{
    await updateToken()
    let invoices = await qbo.findInvoices()
    //.then((invObj) => qbo.getInvoicePdf(invObj.QueryResponse.Invoice[0].Id))
    console.log(invoices)
    //let doc = 
    //console.log(doc) 
    tel.sendDoc(qbo.getInvoicePdf({"Id": invoices.QueryResponse.Invoice[0].Id}))
    //.
  } catch(err)  { console.log(err) }
})

app.listen(port, () => console.log("-- listening on port: " + port))
