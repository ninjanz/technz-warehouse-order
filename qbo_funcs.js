import QuickBooks from 'node-quickbooks-promise';

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

async function createInvoice(payload,) {
    let skuArr = payload.items.map(item => item.sku)
    console.log(skuArr)

    let queryObj = await Promise.all(
        [qbo.findItems({ "Sku": skuArr }),
        qbo.findCustomers({ "DisplayName": payload.customer })])
    //console.log(queryObj)

    // create the line object
    let lineObj = await createLineObj(payload, queryObj[0].QueryResponse.Item)
    //console.log(lineObj)

    // create the invoice with all the required params
    let invoiceObj = {
        "CustomerRef": {
            "value": queryObj[1].QueryResponse.Customer[0].Id,
        },
        "Line": lineObj.lineArr
    }
    try {
        //console.log("-------------------------------------------create-invoice #1-------------------------------------------")
        let inv_response = await qbo.createInvoice(invoiceObj)
        //console.log(inv_response.Id)
        //console.log("-------------------------------------------create-invoice #2-------------------------------------------")
        let send_response = await qbo.sendInvoicePdf(inv_response.Id, "plastic@nzcurryhouse.com")
        //console.log(send_response.Id)
        //console.log("-------------------------------------------create-invoice #3-------------------------------------------")

        console.log("Sent Invoice ", inv_response.Id, "by ", send_response.DeliveryInfo.DeliveryType, "at ", send_response.DeliveryInfo.DeliveryTime)
    } catch (err) {
        console.log(err)
    }

    // print no stock invoice here
    if (lineObj.rejArr.length > 0) console.log("rejected orders: \n", lineObj.rejArr)
};

async function createLineObj(orderObj, stockItems) {
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

async function updateToken() {
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

export { qbo, createInvoice, updateToken };