import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';
import { invoiceQueue } from "./queue.mjs";
import { createPurchaseOrder } from './chicken_order_pdf.mjs';

// setup express with body-parser
const app = express()
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000

// deploy test
app.get('/', (req, res) => {
  res.status(200).send("hellow world!")
})

// qbo token test
app.get('/company', (req, res) => {
  qbo.findCompanyInfos().then(data => { res.send(data); })
  .catch((err) => { console.log(err) });
})


app.post('/create-invoice', async(req, res) => {
  //console.log(req.body);
  let job = await invoiceQueue.add(req.body)
  //console.log(job);
  res.status(200).send(`Request Received! Job ID: ${job.id}`);
})

app.post('/chicken-purchase-order', async (req, res) => {
  try {
      let pdf = await createPurchaseOrder(req.body);
      if (!pdf) {
          console.error('Failed to create PDF');
          return res.status(500).send('Internal Server Error: PDF creation failed');
      }

      // Assuming createPurchaseOrder returns a buffer/stream of the PDF
      const teleBot = new TelegramBot('714200914:AAFCyNlolKsMSDj0snGNRZz8Y7nMdqr_Hg0');
      
      const pdfOptions = {
          // Options if needed
          filename: `${req.body.date} - ${req.body.location}.pdf`,
          contentType: 'application/pdf',
      };

      teleBot.sendDocument('-400162180', pdf, {}, pdfOptions).then(() => {
          res.status(200).send('Request Received!');
      }).catch((err) => {
          console.error('Error sending document to Telegram:', err);
          res.status(500).send('Internal Server Error: Failed to send document');
      });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Allows the client to query the state of a background job
app.get('/job/:id', async (req, res) => {
  let id = req.params.id;
  let job = await invoiceQueue.getJob(id);

  if (job === null) {
    res.status(404).end();
  } else {
    let state = await job.getState();
    let reason = job.failedReason;
    res.json({ id, state, reason });
  }
});

/*app.get('/newInvNum', async (req, res) => {
  try {
  await updateToken()
  let inv = await findInv()

  console.log(inv)
  return res.status(200).send()
  } catch (err) { console.log(err) }
})*/



app.listen(PORT, () => console.log("-- listening on port: " + PORT))
