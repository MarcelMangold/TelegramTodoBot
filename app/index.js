const { botToken} = require('./config/config');
const logger = require('./helpers/logger');
const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const WizardScene = require("telegraf/scenes/wizard");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const Keyboard = require('telegraf-keyboard');
const queries = require('../app/helpers/queries')
const dbAdapter = require('../app/helpers/database-adapter')

const bot = new Telegraf(botToken)

bot.catch((err, ctx) => {
    logger.error(`Ooops, ecountered an error for ${ctx.updateType}`, err)
})

bot.start(
    (ctx) => ctx.reply(
        `Hello ${ctx.from.first_name}, welcome to the todo Bot!\nBelow me you see the available options with which you can interact with me.`,
        Markup.inlineKeyboard(
            [
                Markup.callbackButton("add", "ADD_TODO"),
                Markup.callbackButton("show list", "SHOW_LIST"),
                Markup.callbackButton("set todo(s) to done", "DONE")
            ]
        ).extra()
    )
);

bot.command('options', async (ctx) => ctx.reply(
    `These are the available options for interacting with the bot:`,
    Markup.inlineKeyboard(
        [
            Markup.callbackButton("add todo", "ADD_TODO"),
            Markup.callbackButton("show todolist", "SHOW_LIST"),
            Markup.callbackButton("set todo(s) to done", "DONE")
        ]
    ).extra()
)
);

const addTodo = new WizardScene(
    "add_todo",
    ctx => {
        ctx.reply("Please enter the item, which you want to add");
        return ctx.wizard.next();
    },
    async ctx => {
        let userId = ctx.message.from.id;
        let chatId = ctx.message.chat.id;
        try {
            await addChatAndUserIfNotExist(chatId, userId);
            await dbAdapter.executeQuery(queries.INSERT_TODO, [ctx.message.text, ctx.message.from.id, ctx.message.chat.id])
        }
        catch (err) {
            logger.error(err);
        }

        ctx.wizard.state.item = ctx.message.text;

        ctx.replyWithHTML(
            `Item <b>"${
            ctx.wizard.state.item
            }" </b> added to the todo list`
        );
        return ctx.scene.leave();
    }
);


bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))
bot.action('SHOW_LIST', async (ctx) => {
    let result = await dbAdapter.executeQuery(queries.SHOW_TODOS, [ctx.update.callback_query.message.chat.id, false]);
    let htmlText = '<b>Currently there are no open todos</b>';
    if (result.rows.length > 0) {
        htmlText = '<b>Open todos:</b>';
        for (let i = 0; i < result.rows.length; i++) {
            htmlText += `\n ${i + 1} - ${result.rows[i].name}`;
        }
    }
    ctx.replyWithHTML(htmlText);
})

bot.command('show', async (ctx) => {
    let chatId = ctx.update.message.chat.id;
    await addChatIfNotExist(chatId);
    let result = await dbAdapter.executeQuery(queries.SHOW_TODOS, [chatId, false]);
    let htmlText = '<b>Currently there are no open todos</b>';
    if (result.rows.length > 0) {
        htmlText = '<b>Open todos:</b>';
        for (let i = 0; i < result.rows.length; i++) {
            htmlText += `\n ${i + 1} - ${result.rows[i].name}`;
        }
    }
    ctx.replyWithHTML(htmlText);
})

bot.command('done', (ctx) => {
    setItemsDone(ctx, ctx.update.message.chat.id);
})

bot.action('DONE', (ctx) => {
    setItemsDone(ctx, ctx.update.callback_query.message.chat.id);
})

async function setItemsDone(ctx, chatId) {
    addChatIfNotExist(chatId);
    let result = await dbAdapter.executeQuery(queries.GET_UNFINSHED_TODOS, [chatId, false]);
    if (result.rowCount > 0) {
        const options = {
            inline: true, // default
            duplicates: false, // default
            newline: false, // default
        };

        const keyboard = new Keyboard(options);
        let row = [];
        let rows = [];
        let columnCount = 0;
        for (let i = 0; i < result.rows.length; i++) {
            ++columnCount;
            let string = result.rows[i].name + ":action" + result.rows[i].id;

            row.push(string)
            if (columnCount == 2) {
                rows.push(row);
                row = [];
                columnCount = 0;
            }

        };
        rows.push(row);
        rows.forEach(element => {
            keyboard
                .add(element)
            
        })
        ctx.reply('Open todos (to set a todo as done, click on it):', keyboard.draw());
    }
    else {
        ctx.replyWithHTML('<b>Currently there are no open todos</b>');
    }
};


const regex = new RegExp('action[0-9]');

bot.action(regex, async (ctx) => {
    let actionData = ctx.update.callback_query.data;
    let rows = ctx.update.callback_query.message.reply_markup.inline_keyboard;
    let selectedItem = null;

    rows.forEach(row => {
        row.forEach((column, index, object) => {
            if (column.callback_data == actionData) {
                selectedItem = column.text;
                object.splice(index, 1);
                return;
            }
        });
        if (selectedItem != null)
            return
    });

    let result = await dbAdapter.executeQuery(queries.SET_TODO_FINISH, [actionData.replace("action", "")] );
    if (result.rowCount == 1) {


        ctx.reply(`${selectedItem} is done`, Extra.markup(Markup.removeKeyboard()));
        ctx.editMessageReplyMarkup({
            inline_keyboard: rows

        });
    }
    else
        ctx.reply(`Error when setting the value ${selectedItem} as done`);
});

const stage = new Stage([addTodo]);

bot.use(session());
bot.use(stage.middleware());

bot.command('add', async ({ reply, scene }) => {
    await scene.leave()
    await scene.enter('add_todo')
}
);

bot.action('ADD_TODO', async ({ reply, scene }) => {
    await scene.leave()
    await scene.enter('add_todo')
}
);

bot.launch()

async function addChatAndUserIfNotExist(chatId, userId) {
    await addChatIfNotExist(chatId);
    await addUserIfNotExist(userId);
}

async function addChatIfNotExist(chatId) {
    let response = await dbAdapter.executeQuery(queries.CHECK_IF_CHAT_EXIST, [chatId]);
    if (response.rowCount == 0) {
        dbAdapter.executeQuery(queries.ADD_CHAT, [chatId]);
    }
}

async function addUserIfNotExist(userId) {
    let response = await dbAdapter.executeQuery(queries.CHECK_IF_USER_EXIST, [userId]);
    if (response.rowCount == 0) {
        dbAdapter.executeQuery(queries.ADD_USER, [userId]);
    }
}



