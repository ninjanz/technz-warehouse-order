import TelegramBot from 'node-telegram-bot-api';
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling : true });

//import FileType from 'file-type';

/*bot.onText(/\/bookmark/, (msg, match) => {
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
}) */

const CHAT_ID_2 = '-400162180'

const CHAT_ID = '-371528263'

export { bot, CHAT_ID }
