
import express from 'express';
import bodyParser from 'body-parser';
import Queue from 'bull';
import { qbo, createInvoice, updateToken } from "./qbo_funcs.mjs";

import tel from './telegram_funcs.js';

// setup express with body-parser
const app = express()
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

const downloadQ = new Queue('download', REDIS_URL);
downloadQ.process(async (job) => {
  console.log(`Job received! ${job}`)
  // job is just a json object containing the invoice ID
  try {
    let docBuffer = await qbo.getInvoicePdf({"Id": job.Id});
    console.log("download completed!")
    return docBuffer
  } catch(err) { console.log(err) }
})

// deploy test
app.get('/', (req, res) => {
  res.send("hellow world!")
})

// qbo token test
app.get('/company', (req, res) => {
  qbo.findCompanyInfos().then(data => { res.send(data); })
  .catch((err) => { console.log(err) });
})

// create invoice using this route
app.post('/create-invoice', function (req, res) {
  updateToken()
  .then(createInvoice(req.body))
  .catch((err) => { res.send(err); console.log(err); })
})

app.post('/send-doc', async (req, res) => {
  try{
    await updateToken()
    let invoices = await qbo.findInvoices()
    //.then((invObj) => qbo.getInvoicePdf(invObj.QueryResponse.Invoice[0].Id))
    console.log(invoices)
    let job = await downloadQ.add({"Id": invoices.QueryResponse.Invoice[0].Id})
    return res.json({ id: job.id })
    //console.log(doc) 
    //tel.sendDoc(doc)
    //.
  } catch(err)  { console.log(err) }
})

// Allows the client to query the state of a background job
app.get('/job/:id', async (req, res) => {
  let id = req.params.id;
  let job = await downloadQ.getJob(id);

  if (job === null) {
    res.status(404).end();
  } else {
    let state = await job.getState();
    let reason = job.failedReason;
    res.json({ id, state, reason });
  }
});

downloadQ.on('global:completed', (jobId, result) => {
  console.log(`Job ${jobId} completed! Sending via Telegram now!`)
  tel.sendDoc(result)  
})

app.listen(PORT, () => console.log("-- listening on port: " + PORT))
