var express = require('express');
const { json } = require("express");
var QuickBooks = require('node-quickbooks');

var app = express()
var port = process.env.PORT || 5000

consumerKey = "ABA5XEHuZIotg70Hgz6Ut2g7crpKIQqZevTPAH6q3mK84W2rfY"
consumerSecret = "bIYNXl1NllBYzuXKCPvIECVER0uaGBXhdempZYAZ"
oauthToken = "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..KGSvXIz2uK5xeOS41S8XGA.oWSb9KbR8kEfZvxQgvqGk-s3FtOLnhlE5Kbu2aGLFR58i6phGzEC62vg1gOHc6RXmQbrjd5YGQb_YKy4nHQ0k5t6NNmtG7JsTYpEmHbc5XOR6t66HeUK1Kh9ujrA9oGzn8_lP6z5YA5c2ujdCHE-IrmBp9LrnPnrlpM6OaXz5IyQBeI1nHMQ3Psc33rSxfEP2BPk_Z19jloQdjBQOv_49mHTifibP9VcVGeFrUPytBzvI2J4g-HiOP8f1pjZL_Tuz7y7FQIifbmcPySYY8ulZHd9hCbV-MtAgM4JV8R_gQIi2YFWHeMQVnfppvTOiG9qmyR9Vl2smNfDkXUTZuSTYxVwR2MrX3AvDkZrbqrECRMe734At7OyLr1VwH0mc-gvlv5PgK4wBrYknE8VZGlrFT1Tor3i5FvowQTLemEbRdZ6d1dBD6-TXCWGYBlPb24EwmT9RLpm09LGD7QdqjHeJDALX7zaDVI-UXsOfv4IYQDPmgt-QkhN6kLlX9vaZlul4eEc2zNoakOHJrtyINi_LoMYqgfyokeE3kBJbR93b44-yAkzH6h_spNZUVJAzfqRjm570cr61xNAHX5tqkqsAWAyx9C_APUvFMXGvpPgPrkj3ijNjggwdocwn9N-t76mUhXP1Qy3xbs4lVF2LawtpPbY4LD88gJgeN94FAa1Ck_PXU-n2guVC7fKNf-0d14zTulmw6rz0bXvgCkwqOYIyELoz7hhAH5B5UXZcfgJrQ01WBJTChyI4Qe1sCwMpcSsSIHKB3vuuJGdTXNjLcXNPJpWUD3y2SdhuyQP-0vgCFuguQmVJ6sqseUtoOJoGapODqjOACqJ2z-j4lKsInJmwEshGbMAsBE0MTBOhhSj7T8.a9W7y6VTUmRf7qz5sK8KhA"
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
  createInvoice(req.payload)
  res.send("success?")
})




