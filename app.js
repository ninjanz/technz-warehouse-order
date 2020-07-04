
import express from 'express';
import pkg from 'body-parser';
import Heroku from 'heroku-client';

import { createInvoice, updateToken } from "./qbo_funcs.js";

 
// if environment is development use dotenv else heroku
// also res objects are different when using heroku
if (process.env.NODE_ENV == 'development') { 
  import dotenv from 'dotenv';
  dotenv.config() }


// setup express with body-parser
var app = express()
const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN })

app.use(pkg.json());
const HEROKU_VARS_URL = process.env.HEROKU_VARS_URL
const port = process.env.PORT || 3000

var test_payload = {
  "date": "21-06-2020",
  "items": [{
    "sku": "(HD) 5 x 8 - 1 KG",
    "quantity": 20
  },
  {
    "sku": "(HD) 6 x 9 - 1 KG",
    "quantity": 30
  }
  ],
  "customer": "NZ Curry House @ Wangsa Maju"
};

app.post('/create-invoice', function (req, res) {
  // on heroku, req.body[0] not required
  //update_token().then(createInvoice(req.body[0]))
  console.log("request: ", req)
  updateToken().then(createInvoice(req.body))
  //res.send("success?")
})

app.get('/', (req, res) => {
  heroku.get(HEROKU_VARS_URL).then(vars => {
    console.log(vars)
  })
  res.send("hellow world!")
})

app.get('/company', (req, res) => {
  qbo.findCompanyInfos().then(data => {
    console.log(data);
    res.send(data);
  }).catch((err) => { console.log(err) });
})

app.listen(port, () => console.log(process.env.NODE_ENV + " mode-- listening on port: " + port))
