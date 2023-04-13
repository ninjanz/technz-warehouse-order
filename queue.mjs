import Queue from 'bull';
import Heroku from 'heroku-client';
import moment from 'moment';
import TelegramBot from 'node-telegram-bot-api';
import { createOrderPdf } from './pdf.mjs';
import { checkAccessToken, processOrder } from './quickbooks.mjs';
const invoiceQueue = new Queue('Generate Invoice', process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const teleBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN); // use polling if need to access messages
//const CHICKEN_ORDER_BOT = '-400162180'
const PLASTIC_ORDER_HQ = '-371528263'
const PLASTIC_ORDER_SHOPS = '-487982914'

invoiceQueue.process(async (job, done) => {
  let tokenNeedsRefresh = await checkAccessToken()

  try {
    console.log(`Create Invoice - Job #${job.id} Received!`);
    let filename = `${moment(job.data.date).format('YYMMDD')}-${job.data.customer}`

    // create the invoice and order pdf object
    let { invoicePdf, orderDetails, invNum } = await processOrder(job.data);
    let orderPdf = await createOrderPdf(orderDetails)
    console.log(`pdf created!`);
    //await teleBot.sendDocument(PLASTIC_ORDER_SHOPS, orderPdf, {}, { filename: `${filename}.pdf` })


    done(null, { tokenNeedsRefresh, filename, invNum, orderPdf, invoicePdf });

  } catch (error) {
    console.log(`Error - ${error}`);
    error.tokenNeedsRefresh = tokenNeedsRefresh;
    done(error);
  }
});

invoiceQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully!`);
  teleBot.sendMessage(PLASTIC_ORDER_HQ, `Job ${job.id} completed successfully!`);
  
  // send the invoice and order pdf object to telegram
  teleBot.sendDocument(PLASTIC_ORDER_SHOPS, result.orderPdf, {}, { filename: `${result.filename}.pdf` })
  if (result.invoicePdf) {
    teleBot.sendDocument(PLASTIC_ORDER_SHOPS, result.invoicePdf, {}, { filename: `${result.invNum}.pdf` })
  } else {teleBot.sendMessage(PLASTIC_ORDER_HQ, `No invoice generated. Maybe all the items ordered are out of stock...`);}

  if (result.tokenNeedsRefresh) {
    const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

    heroku.patch(process.env.HEROKU_VARS_URL, {
      body: {
        QUICKBOOKS_ACCESS_TOKEN: process.env.QUICKBOOKS_ACCESS_TOKEN,
        QUICKBOOKS_REFRESH_TOKEN: process.env.QUICKBOOKS_REFRESH_TOKEN,
        QUICKBOOKS_LAST_REFRESH: process.env.QUICKBOOKS_LAST_REFRESH,
      },
    }).then(() => { console.log('Sucessfully updated access_token on heroku...') });
  }
});

invoiceQueue.on('failed', (job, error) => {
  teleBot.sendMessage(PLASTIC_ORDER_SHOPS, `${job.id} - ${error.message}`);

  if (error.tokenNeedsRefresh) {
    const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

    heroku.patch(process.env.HEROKU_VARS_URL, {
      body: {
        QUICKBOOKS_ACCESS_TOKEN: process.env.QUICKBOOKS_ACCESS_TOKEN,
        QUICKBOOKS_REFRESH_TOKEN: process.env.QUICKBOOKS_REFRESH_TOKEN,
        QUICKBOOKS_LAST_REFRESH: process.env.QUICKBOOKS_LAST_REFRESH,
      },
    }).then(() => { console.log('Sucessfully updated access_token on heroku...') });
  }
});

export { invoiceQueue };

