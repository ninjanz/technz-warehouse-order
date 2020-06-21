var express = require('express');
const { json } = require("express");
var QuickBooks = require('node-quickbooks');

var app = express()
var port = process.env.PORT || 5000

consumerKey = "ABA5XEHuZIotg70Hgz6Ut2g7crpKIQqZevTPAH6q3mK84W2rfY"
consumerSecret = "bIYNXl1NllBYzuXKCPvIECVER0uaGBXhdempZYAZ"
oauthToken = "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..pAsXbgVoYk5TD0iQ3NCsmA.JrmGkY-IxoxioxcnDoqm8tmObaV8OvV57PpPatWJxpLSnpbk4pWycLEJxRcj3yw-yJ8l84EyT-hbeNTppDStnYH0pNgwHzy2yHSHN05bxNp-XE5rJQvv7hDSc1An62teyjewXR6YYSB5FW-b_y1fMzK9cxx0yTKyCWfH-Gw26XpShMBPTkJJ6eGAEXQNULKZVnMoqiPmPLChidabCKy7tNv2cKBJblzd64h3qlol8W7_JMv4mKy3GYdNRfG-GhRyyUIrD64NREcQYa_HmeQrc-qqd0JjUdNLxBLxurMBL8taqh6pgpJSpFms73RVLcBm1mwtY5ANhXSm7udRzJsnWWN0KElxxRPaaQ7LZbmhM6lJ2dmpjteOlj4WMddUUB45P0majX1eIwITalyH5rFsYFjaVhgw9bM3G8pI2dDfxZ2YINK6fnXH2IPjpJqbiGuInoo0XSIivQep5dK7Fenb7wbESevwLocESLcYpr4AWELz6MYffdB9nrNhXPQAkP4d3qUG09pxn8MJplFn2ht1OG60a43he3oi_q0w7Bq2LraV4r-5_HxGPEQGJMr25Yfw7whvBCbGSsASPnddEhwjqwJrh73RLWl7eFNSg0KYVyCNA4P9U3Fe-ifJnLOkp2gAR6lkZtx9yQXnuponZNZxaeDeQEZ2Gp6FXrCTKpHM9rTOi6wpPVnR5uzgO5cMkBXZtl6jWNxICsv6z-6Q37MTVtZ5xevbVMu_XE7_mR7jsj0L4bsM3HkozpK1b0fCZhMaHzaOlSlPMpZMyRpD28KRdMTlUhG9PXmRougc8Kw9GOJrYDD72bcrNO3Dmne6WS0aNwMrmBREEoptlQsXD55SFhzA-P_WnNowZ5SVXuzQexI.126NCMC0tI5921lAQefAPw"
realmId = "9130348557724336"
refreshToken = "AB11601378776aTcnjQZG6Lr0QUSM4V2fNsCM9u76fOrD7CRPw"

var qbo = new QuickBooks(consumerKey,
  consumerSecret,
  oauthToken,
  false, // no token secret for oAuth 2.0
  realmId,
  false, // use the sandbox?
  true, // enable debugging?
  null, // set minorversion, or null for the latest version
  '2.0', //oAuth version
  refreshToken);

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
  let custId = payload.customer

  //[itemArr, custObj] = await Promise.all([getSkuArr(skuArr), getCustObj(custId)])
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
      qbo.sendInvoicePdf(invoice.Id, "info@nzcurryhouse.com", function(err, data) {
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
  rejArr= []

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

app.post('/createInv', function(req, res) {
  console.log(req.body)
  //createInvoice(req.body)
  //res.send("success?")
})

app.post('/', function (req, res) {
      console.log(req.params)
      res.send("so postman works")
})

app.get('/', (req, res) => res.send("hellow world!"))

app.listen(port, () => console.log("listening on port " + port))




