import Queue from 'bull';

import { qbo } from './quickbooks.mjs';
import { bot } from './comms.mjs'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

const downloadQ = new Queue('download', REDIS_URL);
downloadQ.process(async (job) => {
  console.log(`Job received!`);
  //console.log(job)
  // job.data is just a json object containing the invoice ID
  return await qbo.getInvoicePdf(job.data.Id);
})

downloadQ.on('completed', (jobId, result) => {
  console.log(`Job ${jobId} completed! Sent via Telegram!`)
  bot.sendDocument("-400162180", result)
})

export { downloadQ };