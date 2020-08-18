/* eslint-disable linebreak-style */
/* eslint-disable no-use-before-define */
/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */
import QuickBooks from 'node-quickbooks-promise';
import Heroku from 'heroku-client';
import PdfPrinter from 'pdfmake';
import moment from 'moment';


const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });
const { HEROKU_VARS_URL } = process.env;

const STORE_EMAIL = 'plastic@nzcurryhouse.com';

const qbo = new QuickBooks(process.env.QUICKBOOKS_CLIENT,
  process.env.QUICKBOOKS_SECRET,
  process.env.QUICKBOOKS_ACCESS_TOKEN,
  false, // no token secret for oAuth 2.0
  process.env.QUICKBOOKS_REALMID,
  false, // use the sandbox?
  true, // enable debugging?
  null, // set minorversion, or null for the latest version
  '2.0', // oAuth version
  process.env.QUICKBOOKS_REFRESH_TOKEN);

async function processOrder(payload) {
  // call funcs which create the invoice
  // 1 search items and customer -- /
  // 2 filter rejected and return both arrays THEN create line object --/
  // 3 create invoice using params -- /
  // 4 create order pdf using params -- /
  // 5 send invoice via email (linked to 4) -- /
  // 6 return invoice id and pdf -- /
  // create the invoice with all the required params

  try {
    const _queryRes = await _queryPayload(payload);
    const _filterRes = await _filterQuery(payload, _queryRes._stock);
    const _lastInv = (await qbo.findInvoices([
      { field: 'DocNumber', value: 'P%', operator: 'LIKE', desc: 'DocNumber', },
      { field: 'limit', value: 3 },
    ])).QueryResponse.Invoice[0];

    console.log(_lastInv)

    const _newInvNum = (parseInt(_lastInv.DocNumber.split('-')[1], 10) + 1).toString();
    console.log(`new invoice number: ${_newInvNum}`)
    //console.log(typeof(moment().format('YYYY').toString()))

    let currYear = moment().format('YYYY').toString()
    console.log(''.concat('P', currYear, '-', _newInvNum))

    // let lineObj = await createLineObj(payload, queryObj[0])
    const _invParams = {
      CustomerRef: {
        value: _queryRes._customer.Id,
        name: _queryRes._customer.DisplayName,
      },
      Line: _filterRes._line,
      DueDate: moment().add(30, 'days').format('YYYY-MM-DD'),
      DocNumber: ''.concat('P', currYear, '-', _newInvNum), // get running number from quickbooks
    };

    const _invRes = await qbo.createInvoice(_invParams);
    const _sendEmail = await qbo.sendInvoicePdf(_invRes.Id, STORE_EMAIL);
    let _orderPdf = {
      name: _queryRes._customer.DisplayName,
      address: ''.concat(_queryRes._customer.BillAddr.Line1, ', ', _queryRes._customer.BillAddr.City, ', ', _queryRes._customer.BillAddr.PostalCode, ', ', _queryRes._customer.BillAddr.CountrySubDivisionCode),
      number: _invParams.DocNumber,
      date: moment().format('YYYY-MM-DD'),
      stock: _filterRes._line.length > 0 ? _filterRes._line : [],
      nostock: _filterRes._rej.length > 0 ? _filterRes._rej : []
    };

    console.log(`PDF PARAMS: ${_orderPdf}`)

    return { invoice: _sendEmail, pdfparams: _orderPdf };
  } catch (err) { console.log(err.Fault); }
}

async function _queryPayload(_payload) {
  const _skus = _payload.items.map((item) => item.sku);
  let _stock = await qbo.findItems({ Sku: _skus });
  _stock = _stock.QueryResponse.Item;

  let _customer = await qbo.findCustomers({ DisplayName: _payload.customer });
  _customer = _customer.QueryResponse.Customer[0];

  console.log(_customer)
  console.log(_stock)

  return { _customer, _stock };
}

async function _filterQuery(_payload, _stock) {
  const _line = [], _rej = [];

  _stock.forEach((element) => {
    _payload.items.forEach((subElement) => {
      if (subElement.sku === element.Sku) {
        // check if there is enough quantity
        if (element.QtyOnHand >= subElement.quantity) {
          const lineBase = {
            DetailType: 'SalesItemLineDetail',
            Amount: element.UnitPrice * subElement.quantity,
            SalesItemLineDetail: {
              ItemRef: {
                value: element.Id,
                name: element.Name
              },
              Qty: subElement.quantity,
              UnitPrice: element.UnitPrice,
            },
          };

          _line.push(lineBase);
        } else {
          // product name, qty ordered
          const product = {
            name: element.Name,
            qty: subElement.quantity,
          };
          _rej.push(product);
        }
      }
    });
  });

  return { _line, _rej };
}

async function _createOrderPdf(_accepted, _rejected) {
  const docDefinition = {
    content: [
      {
        text: 'Order Form',
        style: 'header',
      },
    ],
  };

  const fonts = {
    Roboto: {
      normal: 'fonts/Roboto-Regular.ttf',
      bold: 'fonts/Roboto-Medium.ttf',
      italic: 'fonts/Roboto-Italic.ttf',
    },
  };

  const printer = new PdfPrinter(fonts);

  console.log(_accepted);
  console.log(_rejected);

  const table1 = await createTable(_accepted, 'Accepted Items');
  const table2 = await createTable(_rejected, 'Rejected Items');

  if (table1.length > 0) { docDefinition.content.push(table1); }
  if (table2.length > 0) { docDefinition.content.push(table2); }

  const doc = await printer.createPdfKitDocument(docDefinition);
  doc.end();

  return doc;
}

async function createPdfParams(params) {
  let returnParams = {
    name: params.name,
    address: 'customer address',
    number: 'order number',
    date: 'order date',
    stock: [],
    nostock: []
  }



  return returnParams
}

async function createTable(someArray, tableHeader) {
  const _x = [
    {
      text: tableHeader,
      style: 'subheader',
    },
    {
      table: {
        widths: ['50%', '50%'],
        body: [
          ['Items', 'Quantity'],
        ],
      },
    }];
  if (someArray.length > 0) {
    if (tableHeader === 'Accepted Items') {
      await someArray.forEach((group) => {
        console.log(group);
        _x[1].table.body.push([group.SalesItemLineDetail.ItemRef.value, group.SalesItemLineDetail.Qty]);
      });
    } else {
      someArray.forEach((group) => {
        console.log(group);
        _x[1].table.body.push([group.sku, group.quantity]);
      });
    }

    return _x;
  }
}

async function updateToken() {
  const timeNow = new Date();
  const lastRefresh = process.env.QUICKBOOKS_LAST_REFRESH === '' ? new Date(timeNow - (60 * 1000 * 60)) : new Date(process.env.QUICKBOOKS_LAST_REFRESH);
  const timeDiff = (timeNow - lastRefresh) / (1000 * 60);

  console.log('timeNow: ', timeNow, ', lastRefresh: ', lastRefresh.toISOString(), ', timeDiff: ', timeDiff);

  if (timeDiff >= 55) {
    try {
      const refresh_response = await qbo.refreshAccessToken();

      const dateNow = new Date();
      // console.log("Access Token Refreshed at: ", dateNow.toString(), " / ", dateNow.getTime())
      // console.log("Refresh Response: ", refresh_response)

      await heroku.patch(HEROKU_VARS_URL, {
        body: {
          QUICKBOOKS_ACCESS_TOKEN: refresh_response.access_token,
          QUICKBOOKS_REFRESH_TOKEN: refresh_response.refresh_token,
          QUICKBOOKS_LAST_REFRESH: dateNow,
        },
      });
    } catch (err) { console.log('Error at app.get/update-token: ', err); }
  } else console.log('token update not required');
}

export { qbo, processOrder, updateToken };