
import express from 'express';
import bodyParser from 'body-parser';

import { qbo, createInvoice, updateToken } from "./qbo_funcs.mjs";

import sendDoc from './telegram_funcs.js';

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

app.get('/send-doc', (req, res) => {
    //updateToken()
    //.then(qbo.findInvoices())
    //.then((invObj) => qbo.getInvoicePdf(invObj.QueryResponse.Invoice[0].Id))
    qbo.findInvoices().then(doc => { console.log(doc) })
    //.then((doc) => sendDoc.sendDoc(doc))
    //.catch((err) => console.log(err))
})

app.listen(port, () => console.log("-- listening on port: " + port))
