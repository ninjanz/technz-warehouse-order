const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

async function sendDoc(doc) {
    bot.sendDocument("-400162180", doc)
}

module.exports = { sendDoc }
