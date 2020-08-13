/* eslint-disable linebreak-style */
/* eslint-disable consistent-return */
/* eslint-disable import/extensions */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */

import Queue from 'bull';

import { processOrder, updateToken } from './quickbooks.mjs';
import { bot, CHAT_ID } from './comms.mjs';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const invoiceQ = new Queue('Generate Invoice', REDIS_URL);
invoiceQ.process(async (job) => {
  try {
    console.log(`Create Invoice - Job #${job.id} Received!`);
    await updateToken();

    const _order = await processOrder(job.data);
    // console.log(_order);
    // let _sendEmail = await qbo.sendInvoicePdf(_inv.Id, STORE_EMAIL)
    // let _pdf = await qbo.getInvoicePdf(_inv.Id);
    // let _teleRes = await bot.sendDocument(CHAT_ID, _pdf)

    const _logMessage = `Invoice ${_order.invoice.DocNumber} generated for ${_order.invoice.CustomerRef.name} on ${_order.invoice.TxnDate}; 
              Invoice PDF has been sent via email to ${_order.invoice.BillEmail.Address} on ${}.`;

    return _logMessage;
  } catch (err) { console.log(err); }
});

invoiceQ.on('completed', (jobId, message) => {
  console.log(message);
  bot.sendMessage(CHAT_ID, message);
});

export { invoiceQ };
