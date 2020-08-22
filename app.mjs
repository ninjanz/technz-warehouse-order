import express from 'express';
import bodyParser from 'body-parser';

//import { qbo, createInvoice, updateToken } from "./quickbooks.mjs";
import { invoiceQ } from "./queue.mjs";
import { _findLastInv as findInv, updateToken } from "/.quickbooks.mjs";

// setup express with body-parser
const app = express()
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000

/*// deploy test
app.get('/', (req, res) => {
  res.send("hellow world!")
})

// qbo token test
app.get('/company', (req, res) => {
  qbo.findCompanyInfos().then(data => { res.send(data); })
  .catch((err) => { console.log(err) });
})*/
/*
// create invoice using this route
app.post('/create-invoice-dep', async (req, res) => {
  console.log(req.body)
  try {
    await updateToken()
    let _inv = await createInvoice(req.body)
    let send_response = await qbo.sendInvoicePdf(_inv.Id, "plastic@nzcurryhouse.com")

    let invoices = await qbo.findInvoices(req.body.Id)
    let job = await downloadQ.add({"Id": invoices.QueryResponse.Invoice[0].Id})

    //console.log("Sent Invoice ", _res.Id, "by ", _res.type, "at ", _res.time)

    return res.status(200).send('OK')
  } catch(err) { res.send(err); console.log(err); }
})*/

app.post('/create-invoice', async(req, res) => {
  let job = invoiceQ.add(req.body)

  return res.status(200).send(`Request Received! Job ID: ${job.id}`);
})

/*app.post('/send-doc', async (req, res) => {
  try{
    await updateToken()
    let invoices = await qbo.findInvoices(req.body.Id)
    let job = await downloadQ.add({"Id": invoices.QueryResponse.Invoice[0].Id})

    //console.log(invoices)
    return res.json({ id: job.id })
  } catch(err)  { console.log(err) }
})*/

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

app.get('/newInvNum', async (req, res) => {
  try {
  await updateToken()
  let inv = await findInv()

  console.log(inv)
  return res.status(200).send()
  } catch (err) { console.log(err) }
})



app.listen(PORT, () => console.log("-- listening on port: " + PORT))
