import QuickBooks from 'node-quickbooks-promise';
import Heroku from 'heroku-client';
import * as path from 'path';

/*import jsPDF from 'jspdf/dist/jspdf.node.debug';
import 'jspdf-autotable';

import { createRequire } from 'module';
const require = createRequire(import.meta.url)*/

import PdfPrinter from 'pdfmake';
//import { path } from 'pdfkit/js/mixins/vector';

const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN })
const HEROKU_VARS_URL = process.env.HEROKU_VARS_URL

const STORE_EMAIL = 'plastic@nzcurryhouse.com'

const qbo = new QuickBooks(process.env.QUICKBOOKS_CLIENT,
    process.env.QUICKBOOKS_SECRET,
    process.env.QUICKBOOKS_ACCESS_TOKEN,
    false, // no token secret for oAuth 2.0
    process.env.QUICKBOOKS_REALMID,
    false, // use the sandbox?
    true, // enable debugging?
    null, // set minorversion, or null for the latest version
    '2.0', //oAuth version
    process.env.QUICKBOOKS_REFRESH_TOKEN);

async function processOrder(payload,) {

    // call funcs which create the invoice
    // 1 search items and customer -- /
    // 2 filter rejected and return both arrays THEN create line object --/
    // 3 create invoice using params -- /
    // 4 create order pdf using params -- /
    // 5 send invoice via email (linked to 4) -- /
    // 6 return invoice id and pdf -- /
    // create the invoice with all the required params

    try {
        let _queryRes = await _queryPayload(payload)
        let _filterRes = await _filterQuery(payload, _queryRes._stock)

        //let lineObj = await createLineObj(payload, queryObj[0])
        let _invParams = {
            "CustomerRef": {
                "value": _queryRes._customerID,
            },
            "Line": _filterRes._line
        }
        let _invRes = await qbo.createInvoice(_invParams)
        let _sendEmail = await qbo.sendInvoicePdf(_invRes.Id, STORE_EMAIL)
        let _orderPdf = await _createOrderPdf(_filterRes._line, _filterRes._rej)

        return { invoice: _sendEmail, order: _orderPdf };
    } catch (err) { console.log(err) };

    // print no stock invoice here
    //if (lineObj.rejArr.length > 0) console.log("rejected orders: \n", lineObj.rejArr);
};

async function _queryPayload(_payload) {
    let _skus = _payload.items.map(item => item.sku)
    let _stock = await qbo.findItems({ "Sku": _skus })
    _stock = _stock.QueryResponse.Item

    let _customerID = await qbo.findCustomers({ "DisplayName": _payload.customer })
    _customerID = _customerID.QueryResponse.Customer[0].Id

    return { _customerID, _stock }
}

async function _filterQuery(_payload, _stock) {
    let _line = [], _rej = []

    _stock.forEach(element => {
        _payload.items.forEach(subElement => {
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

                    _line.push(lineBase)
                } else _rej.push(subElement)
            }
        })
    })

    return { _line, _rej }
}

async function _createOrderPdf(_accepted, _rejected) {

    let docDefinition = {
        content: [
            {
                text: 'Order Form',
                style: 'header'
            },
        ],
        styles: {
            header: {
                fontSize: 18,
                bold: true
            },
            subheader: {
                fontSize: 14,
                bold: true
            }
        }
    }
    //write pdf
    /*global.window = { document: { createElementNS: () => { return {} } } };
    global.navigator = {};
    global.btoa = () => { };*/

    //const jsPDF = require('jspdf/dist/jspdf.node.min');


    //let arr = [], arr2 = [];
    //const doc = new jsPDF()
    /*function fontPath(file) {
        return path.resolve('node_modules', 'pdfmake', 'test-env', 'tests', 'fonts', 'file')
    }*/
    const fonts = {
        /*Roboto: {
            normal: fontPath('Roboto-Regular.ttf'),
            bold: fontPath('Roboto-Medium.ttf'),
            italics: fontPath('Roboto-Italic.ttf')
        }*/
        Helvetica: {
            normal: 'Helvetica',
            bold: 'Helvetica-Bold',
            italics: 'Helvetica-Oblique',
            bolditalics: 'Helvetica-BoldOblique'
        }
    }
    const printer = new PdfPrinter(fonts);

    //_rejected.forEach((group) => { arr.push([group.sku, group.quantity]) })
    //_accepted.forEach((group) => { arr2.push([group.ItemRef.value, group.Qty]) })
    console.log(_accepted)
    console.log(_rejected)


    if (_accepted.length > 0) {
        let _x = [
            {
                text: 'Accepted Items',
                style: 'subheader'
            },
            {
                table: {
                    body: [
                        ['Items', 'Quantity']
                    ]
                }
            }]

        await _accepted.forEach((group) => {
            console.log(group)
            _x[1].table.body.push([group.SalesItemLineDetail.ItemRef.value, group.SalesItemLineDetail.Qty])
        })

        docDefinition.content.push(..._x)
    }

    if (_rejected.length > 0) {
        let _x = [
            {
                text: 'Rejected Items',
                style: 'subheader'
            },
            {
                table: {
                    body: [
                        ['Items', 'Quantity']
                    ]
                }
            }]

        await _accepted.forEach((group) => {
            console.log(group)
            _x[1].table.body.push([group.sku, group.quantity])
        })

        docDefinition.content.push(..._x)
    }


    /*delete global.window;
    delete global.navigator;
    delete global.btoa;*/


    const doc = printer.createPdfKitDocument(docDefinition)

    return doc
}

async function updateToken() {
    let timeNow = new Date()
    let lastRefresh = process.env.QUICKBOOKS_LAST_REFRESH === "" ? new Date(timeNow - (60 * 1000 * 60)) : new Date(process.env.QUICKBOOKS_LAST_REFRESH)
    let timeDiff = (timeNow - lastRefresh) / (1000 * 60)

    console.log("timeNow: ", timeNow, ", lastRefresh: ", lastRefresh.toISOString(), ", timeDiff: ", timeDiff)

    if (timeDiff >= 55) {
        try {
            let refresh_response = await qbo.refreshAccessToken()

            let dateNow = new Date()
            //console.log("Access Token Refreshed at: ", dateNow.toString(), " / ", dateNow.getTime())
            //console.log("Refresh Response: ", refresh_response)

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

export { qbo, processOrder, updateToken };









/*async function createLineObj(orderObj, stockItems) {
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
}*/