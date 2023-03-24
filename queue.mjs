import Queue from 'bull';
import Heroku from 'heroku-client';
import moment from 'moment';
import { createOrderPdf } from './pdf.mjs';
import { checkAccessToken, processOrder, refreshAccessToken } from './quickbooks.mjs';
import { bot, PLASTIC_ORDER_HQ, PLASTIC_ORDER_SHOPS } from './comms.mjs';

const invoiceQueue = new Queue('Generate Invoice', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

invoiceQueue.process(async (job) => {

  try {
    console.log(`Create Invoice - Job #${job.id} Received!`);


    // check if the access token is valid; refresh the access token if necessary
    if (checkAccessToken()) { await refreshAccessToken() }
    
    let { invoice, invoicePdf, pdfparams } = await processOrder(job.data);
    //console.log(_order);
    //let _sendEmail = await qbo.sendInvoicePdf(_inv.Id, STORE_EMAIL)
    //let _pdf = await qbo.getInvoicePdf(_inv.Id);
    //let _teleRes = await bot.sendDocument(CHAT_ID, _pdf)

    let orderPdf = await createOrderPdf(pdfparams)
    
    let filename = ''.concat(moment().format('YYMMDD').toString(), ' - ', invoice.CustomerRef.name)
    bot.sendDocument(PLASTIC_ORDER_SHOPS, orderPdf, {}, { filename: `${filename}.pdf` })
    bot.sendDocument(PLASTIC_ORDER_HQ, orderPdf, {}, { filename: `${filename}.pdf` })

    const _logMessage = ''.concat(`Invoice ${invoice.DocNumber} generated for ${invoice.CustomerRef.name} on ${invoice.TxnDate}`,
      `. Invoice PDF has been sent via email to ${invoice.BillEmail.Address}.`)

    return _logMessage;
  } catch (err) { console.log(err); bot.sendMessage(PLASTIC_ORDER_HQ, `Error: ${err}`); }
});

invoiceQueue.on('completed', (jobId, message) => {
  console.log(message);
  bot.sendMessage(PLASTIC_ORDER_HQ, message);
});

invoiceQueue.on('drained', () => {
  const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

  await heroku.patch(process.env.HEROKU_VARS_URL, {
    body: {
      QUICKBOOKS_ACCESS_TOKEN: process.env.QUICKBOOKS_ACCESS_TOKEN,
      QUICKBOOKS_REFRESH_TOKEN: process.env.QUICKBOOKS_REFRESH_TOKEN,
      QUICKBOOKS_LAST_REFRESH: process.env.QUICKBOOKS_LAST_REFRESH,
    },
  }).then(() => { console.log('sucessfully updated access_token on heroku...') });
});















export { invoiceQ };

