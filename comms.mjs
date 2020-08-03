import TelegramBot from 'node-telegram-bot-api';
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling : true });
//import FileType from 'file-type';

bot.onText(/\/bookmark/, (msg, match) => {
    const chatId = msg.chat.id;
    const input = match.input;

    if (input !== undefined) {
        bot.sendMessage(chatId, input)
    }

    else {
        bot.sendMessage(chatId, "type something pls")
    }
})

bot.onText(/\/fetch/, (msg, match) => {
    const chatId = msg.chat.id;
    const input = match.input;

    if (input !== undefined) {
        bot.sendMessage(chatId, input)
    }

    else {
        bot.sendMessage(chatId, "type something pls")
    }
}) 

async function sendDoc(doc) {
    //console.log(doc)
    //console.log(await FileType.fromBuffer(doc))
    //opts = { "contentType": "application/pdf" }

    //await bot.sendMessage("-400162180", "doc get")
    await bot.sendDocument("-400162180", doc, {})
    console.log("doc sent!")
}

const CHAT_ID = '-400162180'

export { bot, CHAT_ID }
