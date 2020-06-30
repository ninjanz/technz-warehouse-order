
import express from 'express';
import pkg from 'body-parser';
const { json } = pkg;
import QuickBooks from 'node-quickbooks-promise';
import Heroku from 'heroku-client';
//import dotEnv from 'dotenv';

//dotEnv.config();

// setup express with body-parser
var app = express()
app.use(json());

// setup heroku
const heroku = new Heroku({
  token: process.env.HEROKU_API_TOKEN
})
const HEROKU_VARS_URL = process.env.HEROKU_VARS_URL

var port = process.env.PORT || 3000

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

async function createInvoice(payload,) {
  let skuArr = payload.items.map(item => item.sku)
  console.log(skuArr)

  let queryObj = await Promise.all([qbo.findItems({ "Sku": skuArr }),
  qbo.findCustomers({ "DisplayName": payload.customer })])
  console.log(queryObj)

  // create the line object
  let lineObj = await createLineObj(payload, queryObj[0].QueryResponse.Item)
  console.log(lineObj)

  // create the invoice with all the required params
  let invoiceObj = {
    "CustomerRef": {
      "value": queryObj[1].QueryResponse.Customer[0].Id,
    },
    "Line": lineObj.lineArr
  }
  try {
    console.log("-------------------------------------------create-invoice #1-------------------------------------------")
    let inv_response = await qbo.createInvoice(invoiceObj)
    console.log(inv_response.Id)
    console.log("-------------------------------------------create-invoice #2-------------------------------------------")
    let send_response = await qbo.sendInvoicePdf(inv_response.Id, "plastic@nzcurryhouse.com")
    console.log(send_response.Id)
    console.log("-------------------------------------------create-invoice #3-------------------------------------------")

    console.log("Sent Invoice ", inv_response.Id, "by ", send_response.DeliveryInfo.DeliveryType, "at ", send_response.DeliveryInfo.DeliveryTime)
  } catch (err) {
    console.log(err)
  }

  // print no stock invoice here
  if (lineObj.rejArr.length > 0) console.log("rejected orders: \n", lineObj.rejArr)
};

async function createLineObj (orderObj, stockItems) {
  let lineArr = []
  let rejArr = []

  stockItems.forEach(element => {
    orderObj.items.forEach(subElement => {
      if (subElement.sku === element.Sku) {

        // check if there is enough quantity
        if (element["QtyOnHand"] >= subElement["quantity"]) {
          let lineBase = {
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
        } else rejArr.push(subElement)
      }
    })
  })
  return {
    "lineArr": lineArr,
    "rejArr": rejArr
  }
}

app.post('/create-invoice', function (req, res) {
  // on heroku, req.body[0] not required
  //update_token().then(createInvoice(req.body[0]))
  console.log("request: ", req)
  update_token().then(createInvoice(req.body))
  //res.send("success?")
})

app.get('/', (req, res) => {
  heroku.get(HEROKU_VARS_URL).then(vars => {
    console.log(vars)
  })
  res.send("hellow world!")
})

async function update_token() {
  let timeNow = new Date()
  let lastRefresh = process.env.QUICKBOOKS_LAST_REFRESH === "" ? new Date(timeNow - (60 * 1000 * 60)) : new Date(Number(process.env.QUICKBOOKS_LAST_REFRESH))
  let timeDiff = (timeNow - lastRefresh) / (1000 * 60)

  console.log("timeNow: ", timeNow, ", lastRefresh: ", lastRefresh.toISOString(), ", timeDiff: ", timeDiff)

  if (timeDiff >= 55) {
    try {
      let refresh_response = await qbo.refreshAccessToken()

      let dateNow = new Date()
      console.log("Access Token Refreshed at: ", dateNow.toISOString(), " / ", dateNow.getTime())
      console.log("Refresh Response: ", refresh_response)

      await heroku.patch(HEROKU_VARS_URL, {
        body: {
          QUICKBOOKS_ACCESS_TOKEN: refresh_response.access_token,
          QUICKBOOKS_REFRESH_TOKEN: refresh_response.refresh_token,
          QUICKBOOKS_LAST_REFRESH: dateNow
        }
      })
    } catch (err) { console.log("Error at app.get/update-token: ", err) }
  } else console.log("token update not required")
}

app.get('/company', (req, res) => {
  qbo.findCompanyInfos().then(data => {
    console.log(data);
    res.send(data);
  }).catch((err) => { console.log(err) });
})

app.listen(port, () => console.log(process.env.NODE_ENV + " mode-- listening on port: " + port))
