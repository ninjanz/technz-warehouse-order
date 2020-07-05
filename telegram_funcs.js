import * as pkg from 'node-telegram-bot-api';

const bot = new pkg.TelegramBot(process.env.TELEGRAM_BOT_TOKEN)

async function sendDoc(doc) {
    bot.sendDocument("-400162180", doc)
}

export {
    sendDoc
}

