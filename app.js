var express = require('express');
const { json } = require("express");
var QuickBooks = require('node-quickbooks');

var app = express()
var port = process.env.PORT || 5000

consumerKey = "ABA5XEHuZIotg70Hgz6Ut2g7crpKIQqZevTPAH6q3mK84W2rfY"
consumerSecret = "bIYNXl1NllBYzuXKCPvIECVER0uaGBXhdempZYAZ"
oauthToken = "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..Rry7n1-CjgmC7bn5fZy4Xw.cYa7HU9zd2naZQQPVJTPEAvdYehnbiTgUBEynJrefd9ZBqPJRWUPENYvQfgMkoNRjkrHoSfUeYdz66Y-DCu4PcI-D9yZny6VcdTEZU7E7-C-Q618Ie4AdAzmow9l5O-FCH2NT3qsEpA9DT9K0tPSAEU3aEavjzgZsZ4jducvziEO137-dAX8yj-GB5xMd7MkKyVzlXzZiDRB3BbA-cbhDLbKbh7e04EpFYXOO2IZGOh-8jCpPMrL790xhTKAiN04DcfCudfpe_Lp88plC_w5HuJYB2Vc8HOrk-j4seo_noNW76zK_aXdylIcEGi5OkZQ6zi9grdDj9NnNYzc-ca_rOnCo5r1qI8k6qa4YOrVHejY0QjUuOQZrZR-IkTSZMEd9tGW_bsB4zfIELbXgOVxSIc47khuf_vJVJPAVq-DexTQBSfQm2zvUCpwMiAvZ9PokaVixGqBkaTt7_04fC6waBb3gYbt3LtvMPCDrpUU1LFWkRRkDQikhTnHQJmKM5-T2U3uO_nbiMxw2OdB3WrUkqfFi4EXDX0KzbI8vKVfe36DO0I50mtdq3rRjSzm4MbvSIwPk5c8W3FnchvOWkXTXn-5-FpJx5uKGI1PvWB-rclwC9o9MhKQ_rYlm1c5b8DukM0Tn7q0RfOh6s-bUnTIVlRwMjdffR1Nqx3lz7DcQwluQk8w7HVVgbBXp892a_ebaiVmoyLc6g8003oGTFiczuoq71MT_kET3_nvEQ4AgUXOc9t1L2wh8GR4l_EywAfMNCSgEeY01zaGDnZBThicbi70X7689SCbwfzauD4AIxslAPnPFmxGHulCWTgLmLF8kFv3PxWrd4csT-opfAfcdnJk35hVmD4PASbbP-k-ojY.jUA4oOG_mwum5vJu9nilcw"
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

createInvoice(test_payload)



