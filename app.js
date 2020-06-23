var express = require('express');
const { json } = require("express");
var bodyParser = require('body-parser');
var QuickBooks = require('node-quickbooks');

var app = express()
app.use(bodyParser.json());
var port = process.env.PORT || 5000

consumerKey = "ABA5XEHuZIotg70Hgz6Ut2g7crpKIQqZevTPAH6q3mK84W2rfY"
consumerSecret = "bIYNXl1NllBYzuXKCPvIECVER0uaGBXhdempZYAZ"
oauthToken = "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..INOAUQQGOdxV__N0FF9znw.trrpn3WtrWsJbS6EIkicqv2eiolpmgq8OG9qz0cgf_eUoeR8PhZmoKexbRcGIbTMGnRcS-HLN8-HwKKqmMTeopRKuJWnyiFsTMGhAFqNRzNYUX22QI1FHZHaTbdPRnROR4-7ylMkqCSY_UO3y2SM4cxI2bifDmjCrwPDwqS4bSJ6D0gR7qzEVT0ey7F6ocPGrILNoClR0JW87r7742fxOogIvG0_vZLuNjDjLlafeTU0z67ihk5pUUCO3bp-H9r0hKdXpciTkEhyNaIm2suqHH3wlu5EmAZSXLbfM-tzbOq3x_k8WWGPO_Ur-RE0UgHCZAAoJuz9vzFklE1DdnEIjwtzrBpiljlKhZC6JIdk6T-1e1QT7rge_EE10Cp9SYFKyFr6un3J7t3Vf8an6CXT203UIfhLYyNfmZi9uQ8OG1xzfYjRwdkXGtTWzbKS5lZlenO3KL4rY5ne7Fy4HffZbTh7-4EB0_YRmBWoJIumeY754PHoDL0mLk3Yiz_y8Mudp1esUF-SkMJ2YFYFuVg8c0QuHBLp0hJ_WJeZt5J4fPN8zsLWLsE-z59GY9ybQVVWxi4aom299nru4jZNspYMBG_LmfVWf2WTs2u-vt6nvHsWambkQsVTFMT0d9tCieqxaD4Yo7K8_7mYdgkBfhYjrrrt16xNf82VecIddfCQ0Rt7lsCCPIIiTMVKyUgOW5RNz9hn1bXUEj7ExKcuL_AIfClsayEofDKMfEZ4KEoVq4C3MnvLORtjzhqw5iQq9qD4dfO084yDgKNpaoSa8wmBVVIF_ainPiJU8bHf3Cu2GstQe46VXFv5OShigq3QWvXAR0UQ0aM-Qm2Ru_2EKx9ACDVQdMwCzAX_zrQ1WpCEuws.5gncwNBF1pEzyaZdDOWsBQ"
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




