import TelegramBot from 'node-telegram-bot-api';
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
//import FileType from 'file-type';

async function sendDoc(doc) {
    //console.log(doc)
    //console.log(await FileType.fromBuffer(doc))
    //opts = { "contentType": "application/pdf" }

    await bot.sendMessage("-400162180", "doc get")
    await bot.sendDocument("-400162180", doc, {})
    console.log("doc sent!")
}

export { bot }
