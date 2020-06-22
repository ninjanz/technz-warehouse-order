var express = require('express');
const { json } = require("express");
var bodyParser = require('body-parser');
var QuickBooks = require('node-quickbooks');

var app = express()
app.use(bodyParser.json());
var port = process.env.PORT || 5000

consumerKey = "ABA5XEHuZIotg70Hgz6Ut2g7crpKIQqZevTPAH6q3mK84W2rfY"
consumerSecret = "bIYNXl1NllBYzuXKCPvIECVER0uaGBXhdempZYAZ"
oauthToken = "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..1XkEuntSsuwzy-Xf0gcgcQ.iGhRZ2yY9OwJK_Gc0n-IA5uRWMwqoRbOHknUikK8aoFtjhYWGqVLI9kWPkGSBvtmHMYPR2F9HS8e6z8c9sCY3N0vlhcPiTvgmLSMMKzmqlcUiekFeBdXKT_8VYYe5MWCCoDBuDwEZogx0coajVqJBv90VbHKhCvOOr9smTGqzUfuUR4E8Q4S90h3C4FIzyF9IgAgUbssF2LATgjwwQVnE9SfOBuSgBrY03nk5RY6_V3WtjqZwidSCS-jUfcIEyTFLoK9reVDPMzWQDg2uqoQB_dOsl2VVMS-OikGsoWdlx7PAJ8ZSFLZ9pwr_Iy8MetlSPL_vSgGydLXcpAJq_RvJANNk4VEIU-Coc2PvaX0TiyXLF-hqDyi32rplHLlrjwfeYrcfnvthRXNELwIw8Tokqzslyu7bZCSCk8pCzUBaKm2R5yMSBGJvdk7-n9vzLD-FVg75HLsXK2_TFx626OZJtU6UAxFmUKP03HPhNw0cyS5-SJV26KqlNaxw9QjE_LI6iwuN181Qp6eZfJPDKvsc5c7HnlKv8o6Nm2dvV0aCv_uQ3VArwg12UMFwDEWmumX_vinmElFPUz3liCETqv4qgC9nUSEGhNMk4HVTunC0COAZ7x95m7OJzIFGebWWhYcBfmtWZwrZcU1bRFYSJe8ufDqrg2bZfu-GUabPBXLDf0gPx5sAyaALAq2FC0IHr9-3pnLvfI7H4mnfP81MyD6mz7JB2RoW2VtuFx5qkbvxjGDjunJ0YTIkcfHyexzm5hxAq2Se3yOfH3ryRSu3EDrv-R8SQYCZGY6gdIhABvzXGW8kL2Qq5wtyRZRFbCi-mMx10KAYnZQwEFiz3CcV3PXKiP5YbwwaJ4060RUjQSASUo.fjZhESHi2AZ_CKELbsxl7w"
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
createInvoice(req.body)
  //res.send("success?")
})

app.post('/', function (req, res) {
      console.log(req.body)
      res.send("so postman works")
})

app.get('/', (req, res) => res.send("hellow world!"))

app.listen(port, () => console.log("listening on port " + port))




