var express = require('express');
const { json } = require("express");
var bodyParser = require('body-parser');
var QuickBooks = require('node-quickbooks');
require('dotenv').config()
const Heroku = require('heroku-client');

const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN })
var app = express()
app.use(bodyParser.json());
var port = process.env.PORT || 500
var HEROKU_VARS_URL = '/apps/quickbooks-api-create-invoice/config-vars'

if (process.env.NODE_ENV == 'development') {
  heroku.get(HEROKU_VARS_URL).then(data => {
    console.log(data)
    process.env.QUICKBOOKS_CLIENT = data["QUICKBOOKS_CLIENT"]
    process.env.QUICKBOOKS_SECRET = data["QUICKBOOKS_SECRET"]
    process.env.QUICKBOOKS_REALMID = data["QUICKBOOKS_REALMID"]
    process.env.QUICKBOOKS_ACCESS_TOKEN = data["QUICKBOOKS_ACCESS_TOKEN"]
    process.env.QUICKBOOKS_REFRESH_TOKEN = data["QUICKBOOKS_REFRESH_TOKEN"]
    process.env.QUICKBOOKS_LAST_REFRESH = data["QUICKBOOKS_LAST_REFRESH"]
  })
}

var qbo = new QuickBooks(process.env.QUICKBOOKS_CLIENT,
  process.env.QUICKBOOKS_SECRET,
  process.env.QUICKBOOKS_ACCESS_TOKEN,
  false, // no token secret for oAuth 2.0
  process.env.QUICKBOOKS_REALMID,
  false, // use the sandbox?
  true, // enable debugging?
  null, // set minorversion, or null for the latest version
  '2.0', //oAuth version
  process.env.QUICKBOOKS_REFRESH_TOKEN);


var test_payload = {
  "date": "21-06-2020",
  "items": [
    {
      "sku": "(HD) 5 x 8 - 1 KG",
      "quantity": 20
    },
    {
      "sku": "(HD) 6 x 9 - 1 KG",
      "quantity": 30
    }
  ],
  "customer": "NZ Curry House @ Wangsa Maju"
}

const createInvoice = async (payload,) => {
  let skuArr = payload.items.map(item => item.sku)
  let custId = typeof payload.customer == undefined ? payload.location : payload.customer

  queryObj = await Promise.all([getSkuArr(skuArr), getCustObj(custId)])
  console.log(queryObj)

  // create the line object
  lineObj = await createLineObj(payload, queryObj[0].QueryResponse.Item)

  // create the invoice with all the required params
  invoiceObj = {
    "CustomerRef": {
      "value": queryObj[1].QueryResponse.Customer[0].Id,
    },
    "Line": lineObj.lineArr
  }

  qbo.createInvoice(invoiceObj, function (err, invoice) {
    if (err) console.log(err)
    else {
      qbo.sendInvoicePdf(invoice.Id, "info@nzcurryhouse.com", function (err, data) {
        if (err) console.log(err)
      })
      console.log("DONE/n")
    }
  })

  // print no stock invoice here
  if (lineObj.rejArr.length > 0) console.log(rejArr)
};

const getSkuArr = async (skuArr) => {
  return new Promise((resolve, reject) => {
    qbo.findItems({ "Sku": skuArr }, function (err, data) {
      if (err) reject(console.log(err))
      else resolve(data)
    })
  })
};

const getCustObj = async (cust) => {
  return new Promise((resolve, reject) => {
    qbo.findCustomers({ "DisplayName": cust }, function (err, data) {
      if (err) reject(console.log(err))
      else resolve(data)
    })
  })
};

const createLineObj = async (orderObj, stockItems) => {
  lineArr = []
  rejArr = []

  stockItems.forEach(element => {
    orderObj.items.forEach(subElement => {
      if (subElement.sku === element.Sku) {

        // check if there is enough quantity
        if (element["QtyOnHand"] >= subElement["quantity"]) {
          lineBase =
          {
            "DetailType": "SalesItemLineDetail",
            "Amount": element["UnitPrice"] * subElement["quantity"],
            "SalesItemLineDetail": {
              "ItemRef": {
                "value": element.Id,
              },
              "Qty": subElement["quantity"]
            }
          }

          lineArr.push(lineBase)
        }
        else rejArr.push(subElement)
      }
    })
  })
  return { "lineArr": lineArr, "rejArr": rejArr }
}

app.post('/create-invoice', function (req, res) {
  console.log(req.body)
  createInvoice(req.body[0])
  //res.send("success?")
})

app.post('/', function (req, res) {
  console.log(req.body)
  res.send("so postman works")
})

app.get('/', (req, res) => {
  heroku.get(HEROKU_VARS_URL).then(vars => { console.log(vars) })
  res.send("hellow world!")
})

app.get('/update-token', (req, res) => {

  console.log(qbo.refreshToken)
  qbo.refreshAccessToken((err, data) => {
    if (err) { console.log(err) }
    else {
      dateNow = new Date().toISOString()
      console.log("Access Token Refreshed at " + dateNow)
      console.log(data)
      heroku.patch(HEROKU_VARS_URL, {
        body: {
          QUICKBOOKS_ACCESS_TOKEN: data.access_token,
          QUICKBOOKS_REFRESH_TOKEN: data.refresh_token,
          QUICKBOOKS_LAST_REFRESH: dateNow
        }
      })
    }
  })
})

app.get('/company', (req, res) => {
  qbo.findCompanyInfos((err, data) => {
    if (!err) {
      console.log(data)
      res.body = data
    }

    else console.log(err)
  })
})

app.listen(port, () => console.log(process.env.NODE_ENV + " mode-- listening on port: " + port))




