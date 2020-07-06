const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

async function sendDoc(doc) {
    await bot.sendMessage("-400162180", "doc get")
    //await bot.sendDocument("-400162180", doc)
    console.log("doc sent!")
}

module.exports = { sendDoc }
