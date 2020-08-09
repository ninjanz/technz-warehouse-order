import Queue from 'bull';

import { qbo, processOrder, updateToken } from './quickbooks.mjs';
import { bot, CHAT_ID } from './comms.mjs'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const STORE_EMAIL = 'plastic@nzcurryhouse.com'

/*const downloadQ = new Queue('download', REDIS_URL);
downloadQ.process(async (job) => {
  console.log(`Job received!`);
  //console.log(job)
  // job.data is just a json object containing the invoice ID
  return await qbo.getInvoicePdf(job.data.Id);
})

downloadQ.on('completed', (jobId, result) => {
  console.log(`Job ${jobId} completed! Sent via Telegram!`)
  bot.sendDocument(CHAT_ID, result)
})*/

const invoiceQ = new Queue('Generate Invoice', REDIS_URL);
invoiceQ.process(async (job) => {
  try {
    console.log(`Create Invoice - Job #${job.id} Received!`);
    await updateToken()

    let _order = await processOrder(job.data)
    //console.log(_order);
    let _teleRes = await bot.sendDocument(CHAT_ID, _order.order.getBuffer())
    //let _sendEmail = await qbo.sendInvoicePdf(_inv.Id, STORE_EMAIL)
    //let _pdf = await qbo.getInvoicePdf(_inv.Id);
    //let _teleRes = await bot.sendDocument(CHAT_ID, _pdf)
    
    let _logMessage = `Invoice ${_order.invoice.DocNumber} generated for ${_order.invoice.CustomerRef.name} on ${_order.invoice.TxnDate}; 
              Invoice PDF has been sent via email to ${_order.invoice.BillEmail.Address}.`

    return _logMessage;

  } catch(err) { console.log(err) };
})

invoiceQ.on('completed', (jobId, message) => {
  console.log(message)
  bot.sendMessage(CHAT_ID, message)
})



















export { invoiceQ };