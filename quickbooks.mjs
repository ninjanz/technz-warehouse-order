import QuickBooks from 'node-quickbooks-promise';
import moment from 'moment';

const STORE_EMAIL = 'plastic@nzcurryhouse.com';
const quickBooks = new QuickBooks(
  process.env.QUICKBOOKS_CLIENT,
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
    const { customer } = await quickBooks.findCustomers({ DisplayName: payload.customer }).QueryResponse.Customer[0];
    const items = payload.items.map(item => item.sku);
    const stock = await quickBooks.findItems({ Sku: items }).QueryResponse.Item;
    const { line: lineItems, rejected: rejectedItems } = await filterQuery(payload, stock);
    const invNum = await findNextInvoiceNumber();

    const invParams = {
      CustomerRef: {
        value: customer.Id,
        name: customer.DisplayName,
      },
      Line: lineItems,
      DueDate: moment().format('YYYY-MM-DD'),
      DocNumber: invNum,
    };

    let invoice = await quickBooks.createInvoice(invParams);
    // the email status parameter will be set to EmailSent
    invoice = await quickBooks.sendInvoicePdf(invoice.Id, STORE_EMAIL);
    invoicePdf = await quickBooks.getInvoicePdf(invoice.Id)

    const pdfparams = {
      name: customer.DisplayName,
      address: `${customer.BillAddr.Line1}, ${customer.BillAddr.City}, ${customer.BillAddr.PostalCode}, ${customer.BillAddr.CountrySubDivisionCode}`,
      number: invParams.DocNumber,
      date: moment().format('YYYY-MM-DD'),
      stock: lineItems.length > 0 ? lineItems : [],
      nostock: rejectedItems.length > 0 ? rejectedItems : []
    };
  } catch (err) { throw err; }

  console.log(`PDF PARAMS: ${pdfparams}`);

  return { invoice, invoicePdf, pdfparams };
}

async function filterQuery(payload, stock) {
  const lineItems = [];
  const rejectedItems = [];

  for (const item of payload.items) {
    const stockItem = stock.find(s => s.Sku === item.sku);

    if (!stockItem) {
      // Item not found in stock
      rejectedItems.push({ name: item.name, qty: item.quantity });
    } else if (stockItem.QtyOnHand < item.quantity) {
      // Not enough quantity in stock
      rejectedItems.push({ name: stockItem.Name, qty: item.quantity });
    } else {
      // Item found in stock and quantity is sufficient
      const { Id, Name, UnitPrice, QtyOnHand } = stockItem;
      const { sku, quantity } = item;
      const lineBase = {
        DetailType: 'SalesItemLineDetail',
        Amount: UnitPrice * quantity,
        SalesItemLineDetail: {
          ItemRef: { value: Id, name: Name },
          Qty: quantity,
          UnitPrice,
        },
      };

      lineItems.push(lineBase);
    }
  }

  return { lineItems, rejectedItems };
};

async function findNextInvoiceNumber() {
  const lastInvoiceNumber = await findLastInvoiceNumber();
  const prefix = `P${moment().format('YY')}-`;
  let invNum = parseInt(lastInvoiceNumber.split('-')[1], 10) + 1;
  let fullInvNum;

  for (; ;) {
    fullInvNum = `${prefix}${invNum.toString().padStart(3, '0')}`;
    const queryResult = await quickBooks.findInvoices([{ field: 'DocNumber', value: fullInvNum }]);

    if (Object.entries(queryResult.QueryResponse).length === 0) {
      break;
    }

    invNum++;
  }

  return fullInvNum;
}

async function findLastInvoiceNumber() {
  try {
    const queryResult = await quickBooks.findInvoices([
      { field: 'DocNumber', value: `P${moment().format('YY')}%`, operator: 'LIKE', desc: 'DocNumber', },
      { field: 'limit', value: 5 },
    ]);

    let lastInvoiceNumber = `P${moment().format('YY')}-000`;
    if (queryResult.QueryResponse.Invoice.length > 0) {
      lastInvoiceNumber = queryResult.QueryResponse.Invoice[0].DocNumber
    }

    return lastInvoiceNumber;

  } catch (err) { console.error(err); throw err; }
}

function checkAccessToken() {
  const timeNow = new Date();
  const lastRefresh = process.env.QUICKBOOKS_LAST_REFRESH === '' ? new Date(timeNow - (60 * 1000 * 60)) : new Date(process.env.QUICKBOOKS_LAST_REFRESH);
  const timeDiff = (timeNow - lastRefresh) / (1000 * 60);

  console.log('timeNow: ', timeNow, ', lastRefresh: ', lastRefresh.toISOString(), ', timeDiff: ', timeDiff);

  return timeDiff >= 55;
}

async function refreshAccessToken() {
  try {
    const refresh_response = await quickBooks.refreshAccessToken();
    const dateNow = new Date();
    console.log("Access Token Refreshed at: ", dateNow.toString(), " / ", dateNow.getTime())
    console.log("Refresh Response: ", refresh_response)

    quickBooks.token = refresh_response.access_token
    quickBooks.refreshToken = refresh_response.refresh_token

    process.env.QUICKBOOKS_ACCESS_TOKEN = refresh_response.access_token
    process.env.QUICKBOOKS_REFRESH_TOKEN = refresh_response.refresh_token
    process.env.QUICKBOOKS_LAST_REFRESH = dateNow

  } catch (err) { console.log('Error at app.get/update-token: ', err); }
}


export { processOrder, checkAccessToken, refreshAccessToken };
