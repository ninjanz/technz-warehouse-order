
import express from 'express';
import bodyParser from 'body-parser';
import Heroku from 'heroku-client';

import { qbo, createInvoice, updateToken } from "./qbo_funcs.js";

import { sendDoc } from './telegram_funcs,js';

// setup express with body-parser
var app = express()
app.use(bodyParser.json());

const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN })
const HEROKU_VARS_URL = process.env.HEROKU_VARS_URL
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
  sendDoc(qbo.getInvoicePdf('1001'))
})


app.listen(port, () => console.log("-- listening on port: " + port))
