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
  //let tokenTest = await quickBooks.findCompanyInfos()
  //console.log(tokenTest);
  let invoicePdf = null;
  let orderDetails = {
    name: '',
    address: '',
    number: '',
    date: '',
    pdfList: []
  }

  try {
    // search the customer details
    const customer = (await quickBooks.findCustomers({ DisplayName: payload.customer })).QueryResponse.Customer[0];
    //console.log(customer);
    // create a list of items that need to be searched on qb and then find their details
    const items = payload.items.map(item => item.sku);
    const stock = (await quickBooks.findItems({ Sku: items })).QueryResponse.Item;

    // check which of the ordered items are available in stock
    const { lineItems, pdfList } = await filterQuery(payload, stock);
    const invNum = await findNextInvoiceNumber();

    // create the invoice on quickbooks
    let invoiceObj = await quickBooks.createInvoice({
      TxnDate: moment(payload.date).format('YYYY-MM-DD'),
      DocNumber: invNum,
      CustomerRef: {
        value: customer.Id,
        name: customer.DisplayName,
      },
      Line: lineItems,
    })

    // the email status parameter will be set to EmailSent then get the invoice from server
    invoiceObj = await quickBooks.sendInvoicePdf(invoiceObj.Id, STORE_EMAIL);
    invoicePdf = await quickBooks.getInvoicePdf(invoiceObj.Id);

    orderDetails = {
      name: customer.DisplayName,
      address: `${customer.BillAddr.Line1}, ${customer.BillAddr.City}, ${customer.BillAddr.PostalCode}, ${customer.BillAddr.CountrySubDivisionCode}`,
      number: invNum,
      date: moment(payload.date).format('YYYY-MM-DD'),
      pdfList: pdfList.length > 0 ? pdfList : []
    };
  } catch (err) { console.log(err) }

  console.log(`ORDER PDF DETAILS: ${orderDetails}`);

  return { invoicePdf, orderDetails, invNum };
}

async function filterQuery(payload, stock) {
  const lineItems = [];
  const pdfList = [];

  for (const item of payload.items) {
    const stockItem = stock.find(s => s.Sku === item.sku);

    if (!stockItem) {
      // if item does not exist
      pdfList.push({
        name: item.name,
        qty: item.quantity,
        qtyAvailable: 'N/A'
      });
    }

    else {
      pdfList.push({
        name: stockItem.Name,
        qty: item.quantity,
        qtyAvailable: stockItem.QtyOnHand,
        acceptedBool: stockItem.QtyOnHand > item.quantity ? true : false
      });

      if (stockItem.QtyOnHand > item.quantity) {
        const { Id, Name, UnitPrice } = stockItem;
        const lineBase = {
          DetailType: 'SalesItemLineDetail',
          Amount: UnitPrice * item.quantity,
          SalesItemLineDetail: {
            ItemRef: { value: Id, name: Name },
            Qty: item.quantity,
            UnitPrice,
          }
        };
        // add the available items to the list for invoice processing
        lineItems.push(lineBase);
      }
    }
  }

  return { lineItems, pdfList };
}

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

async function checkAccessToken() {
  let refreshBool = false;
  const timeNow = new Date();
  const lastRefresh = process.env.QUICKBOOKS_LAST_REFRESH === '' ? new Date(timeNow - (60 * 1000 * 60)) : new Date(process.env.QUICKBOOKS_LAST_REFRESH);
  const timeDiff = (timeNow - lastRefresh) / (1000 * 60);

  console.log(`timeNow: ${timeNow}, lastRefresh: ${lastRefresh.toISOString()}, timeDiff: ${timeDiff}`);

  if (timeDiff >= 55) { await refreshAccessToken(); refreshBool = true};

  return refreshBool;
}

async function refreshAccessToken() {
  try {
    const refresh_response = await quickBooks.refreshAccessToken();
    const dateNow = new Date();
    console.log(`Access Token Refreshed at: ${dateNow.toString()}`)
    console.log(`Refresh Response: ${refresh_response}`)

    quickBooks.token = refresh_response.access_token
    quickBooks.refreshToken = refresh_response.refresh_token

    process.env.QUICKBOOKS_ACCESS_TOKEN = refresh_response.access_token
    process.env.QUICKBOOKS_REFRESH_TOKEN = refresh_response.refresh_token
    process.env.QUICKBOOKS_LAST_REFRESH = dateNow

  } catch (err) { console.log('Error at method: quickbooks/refreshAccessToken(): ', err); }
}


export { processOrder, checkAccessToken };
