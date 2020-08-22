import QuickBooks from 'node-quickbooks-promise';
import Heroku from 'heroku-client';
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

  try {
    let { _customer: customer, _stock: stock } = await _queryPayload(payload);
    let { _line: line, _rej: reject } = await _filterQuery(payload, stock);
    console.log(`line: ${line}`)
    console.log(`rejected: ${reject}`)
    let invNum = await _findLastInv();
    console.log(`invNum: ${invNum}`)

    const _invParams = {
      CustomerRef: {
        value: customer.Id,
        name: customer.DisplayName,
      },
      Line: line,
      DueDate: moment().add(30, 'days').format('YYYY-MM-DD'),
      DocNumber: invNum, // get running number from quickbooks
    };

    let _invRes = await qbo.createInvoice(_invParams);
    let _sendEmail = await qbo.sendInvoicePdf(_invRes.Id, STORE_EMAIL);
    let _orderPdf = {
      name: customer.DisplayName,
      address: ''.concat(customer.BillAddr.Line1, ',', customer.BillAddr.City, ', ', customer.BillAddr.PostalCode, ', ', customer.BillAddr.CountrySubDivisionCode),
      number: _invParams.DocNumber,
      date: moment().format('YYYY-MM-DD'),
      stock: line.length > 0 ? line : [],
      nostock: reject.length > 0 ? reject : []
    };

    console.log(`PDF PARAMS: ${_orderPdf}`)

    return { invoice: _sendEmail, pdfparams: _orderPdf };
  } catch (err) { console.log(err.Fault); }
}

async function _queryPayload(_payload) {
  let _skus = _payload.items.map((item) => item.sku);
  let _stock = (await qbo.findItems({ Sku: _skus })).QueryResponse.Item;
  let _customer = (await qbo.findCustomers({ DisplayName: _payload.customer })).QueryResponse.Customer[0];

  console.log(`customer deets: ${_customer}`)
  console.log(`order deets: ${_stock}`)

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

  console.log(`filterQuery -- line: ${_line}`)
  console.log(`filterQuery -- rejected: ${_rej}`)
  return { _line, _rej };
}

async function _findLastInv() {
  
  let _lastInvRes = (await qbo.findInvoices([
    { field: 'DocNumber', value: 'P%', operator: 'LIKE', desc: 'TxnDate', },
    { field: 'limit', value: 5 },
  ])).QueryResponse.Invoice;

  console.log(_lastInvRes)

  _lastInvRes = _lastInvRes.sort(function(a, b) {
    numA = parseInt(a.DocNumber.split('-')[1], 10)
    numB = parseInt(b.DocNumber.split('-')[1], 10)

    if (numA > numB) return 1;
    if (numB > numA) return -1;
  }).reverse()[0]

  let invNum = ((parseInt(_lastInv.DocNumber.split('-')[1], 10) + 1).toString()).padStart(5, '0');
  console.log(`new invoice number: ${invNum}`)

  invNum = ''.concat('P', moment().format('YYYY').toString(), '-', invNum)

  return invNum
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