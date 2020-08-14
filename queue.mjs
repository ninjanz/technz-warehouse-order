/* eslint-disable linebreak-style */
/* eslint-disable consistent-return */
/* eslint-disable import/extensions */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */

import Queue from 'bull';
import moment from 'moment';

import { processOrder, updateToken } from './quickbooks.mjs';
import { bot, PLASTIC_ORDER_HQ, PLASTIC_ORDER_SHOPS } from './comms.mjs';
import { createOrderPdf } from './pdf.mjs'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const invoiceQ = new Queue('Generate Invoice', REDIS_URL);
invoiceQ.process(async (job) => {
  try {
    console.log(`Create Invoice - Job #${job.id} Received!`);
    await updateToken();

    const _order = await processOrder(job.data);
    //console.log(_order);
    //let _sendEmail = await qbo.sendInvoicePdf(_inv.Id, STORE_EMAIL)
    //let _pdf = await qbo.getInvoicePdf(_inv.Id);
    //let _teleRes = await bot.sendDocument(CHAT_ID, _pdf)

    let orderpdf = await createOrderPdf(_order.pdfparams)
    let filename = ''.concat(moment().format('YYMMDD').toString(), ' - ', _order.invoice.CustomerRef.name)
    bot.sendDocument(PLASTIC_ORDER_SHOPS, orderpdf, {}, {filename: `${filename}.pdf`})
    bot.sendDocument(PLASTIC_ORDER_HQ, orderpdf, {}, {filename: `${filename}.pdf`})

    const _logMessage = `Invoice ${_order.invoice.DocNumber} generated for ${_order.invoice.CustomerRef.name} on ${_order.invoice.TxnDate}; 
              Invoice PDF has been sent via email to ${_order.invoice.BillEmail.Address}.`;

    return _logMessage;
  } catch (err) { console.log(err); }
});

invoiceQ.on('completed', (jobId, message) => {
  console.log(message);
  bot.sendMessage(PLASTIC_ORDER_HQ, message);
});

export { invoiceQ };
