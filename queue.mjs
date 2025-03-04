import Queue from 'bull';
import Heroku from 'heroku-client';
import moment from 'moment';
import TelegramBot from 'node-telegram-bot-api';
import { createOrderPdf } from './pdf.mjs';
import { checkAccessToken, processOrder } from './quickbooks.mjs';
const invoiceQueue = new Queue('Generate Invoice', process.env.REDIS_URL || 'redis://default:FLoC8pORDv8WUZxr3ESxepIhIAlI7GuR@redis-13383.c77.eu-west-1-1.ec2.redns.redis-cloud.com:13383');
const billQueue = new Queue('Generate Bill', process.env.REDIS_URL || 'redis://default:FLoC8pORDv8WUZxr3ESxepIhIAlI7GuR@redis-13383.c77.eu-west-1-1.ec2.redns.redis-cloud.com:13383');
const teleBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN); // use polling if need to access messages
//const CHICKEN_ORDER_BOT = '-400162180'
//const PLASTIC_ORDER_SHOPS = '-936671955' //test group
//const PLASTIC_ORDER_SHOPS_OLD = '-487982914' // prod group
const PLASTIC_ORDER_SHOPS = '-1002085439219' // prod group

invoiceQueue.process(async (job, done) => {
  let tokenNeedsRefresh = await checkAccessToken()

  try {
    console.log(`Create Invoice - Job #${job.id} Received!`);
    let filename = `${moment(job.data.date).format('YYMMDD')}-${job.data.customer}`

    // create the invoice and order pdf object
    let { invoicePdf, orderDetails, invNum } = await processOrder(job.data);
    let orderPdf = await createOrderPdf(orderDetails)
    
    // send the invoice and the order pdf
    teleBot.sendDocument(PLASTIC_ORDER_SHOPS, orderPdf, {}, { filename: `${filename}.pdf` });
    if (invoicePdf) {
      teleBot.sendDocument(PLASTIC_ORDER_SHOPS, invoicePdf, {}, { filename: `${invNum}` })
    } else {
      teleBot.sendMessage(PLASTIC_ORDER_SHOPS, `No invoice generated. Maybe all the items ordered are out of stock...`);
    }

    done(null, {});

  } catch (error) {
    console.log(`Error - ${error}`);
    done(error);

  } finally {
    if (tokenNeedsRefresh) {
      const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

      heroku.patch(process.env.HEROKU_VARS_URL, {
        body: {
          QUICKBOOKS_ACCESS_TOKEN: process.env.QUICKBOOKS_ACCESS_TOKEN,
          QUICKBOOKS_REFRESH_TOKEN: process.env.QUICKBOOKS_REFRESH_TOKEN,
          QUICKBOOKS_LAST_REFRESH: process.env.QUICKBOOKS_LAST_REFRESH,
        },
      }).then(() => { console.log('Sucessfully updated access_token on heroku...') });
    }
  }
});

invoiceQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully!`);
  teleBot.sendMessage(PLASTIC_ORDER_SHOPS, `Job ${job.id} completed successfully!`);
});

invoiceQueue.on('failed', (job, error) => {
  console.log(error);
  teleBot.sendMessage(PLASTIC_ORDER_SHOPS, `${job.id} - ${error}`);
});

export { invoiceQueue };

