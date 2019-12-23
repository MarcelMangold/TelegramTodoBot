const { botToken, databaseConnection } = require('./config/config');
const logger = require('./helpers/logger');
const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const WizardScene = require("telegraf/scenes/wizard");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");

const { Pool } = require('pg')
const pool = new Pool(databaseConnection)



const bot = new Telegraf(botToken)

bot.catch((err, ctx) => {
    console.log(`Ooops, ecountered an error for ${ctx.updateType}`, err)
    logger.error(`Ooops, ecountered an error for ${ctx.updateType}`, err)
})

bot.start(
    (ctx) => ctx.reply(
        `How can I help you, ${ctx.from.first_name}?`,
        Markup.inlineKeyboard(
            [
                Markup.callbackButton("add", "add_todo"),
                Markup.callbackButton("show list", "SHOW_LIST")
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
            const insertTodoQuery = {
                text: 'INSERT INTO todo.todo (name,  user_id, chat_id) VALUES ($1, $2, $3);',
                values: [ctx.message.text, ctx.message.from.id, ctx.message.chat.id]
            }

            const checkIfUserExist = {
                text: 'SELECT * FROM todo.user_management where id= $1',
                values: [userId]
            }

            const checkIfChatExist = {
                text: 'SELECT * FROM todo.chat where id= $1',
                values: [chatId]
            }

            const addChat = {
                text: 'INSERT INTO todo.chat (id) VALUES ($1)',
                values: [chatId]
            }

            const addUser = {
                text: 'INSERT INTO todo.user_management (id) VALUES ($1)',
                values: [userId]
            }

            let response = await pool.query(checkIfUserExist);
            if (response.rowCount == 0) {
                pool.query(addUser, (err, res) => {
                    if (err) {
                        throw err
                    }
                })
            }

            response = await pool.query(checkIfChatExist);
            if (response.rowCount == 0) {
                pool.query(addChat, (err, res) => {
                    if (err) {
                        throw err
                    }
                })
            }
            response = await pool.query(insertTodoQuery);
        }
        catch (err) {

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
    const query = {
        text: 'SELECT * FROM todo.todo WHERE todo.chat_id = $1 AND todo.is_finished = $2',
        values: [ctx.update.callback_query.message.chat.id, false]
    }
    pool.query(query, (err, res) => {
        if (err) {
            throw err
        }
        let htmlText = '<b>Currently there are no open todos</b>';
        if (res.rows.length > 0) {
            htmlText = '<b>Open todos:</b>';
            for (let i = 0; i < res.rows.length; i++) {
                htmlText += `\n ${i + 1} - ${res.rows[i].name}`;
            }
        }
        ctx.replyWithHTML(htmlText);
    })
})

bot.command('show', (ctx) => {
    const query = {
        text: 'SELECT * FROM todo.todo WHERE todo.chat_id = $1 AND todo.is_finished = $2',
        values: [ctx.update.message.chat.id, false]
    }
    pool.query(query, (err, res) => {
        if (err) {
            throw err
        }
        let htmlText = '<b>Currently there are no open todos</b>';
        if (res.rows.length > 0) {
            htmlText = '<b>Open todos:</b>';
            for (let i = 0; i < res.rows.length; i++) {
                htmlText += `\n ${i + 1} - ${res.rows[i].name}`;
            }
        }
        ctx.replyWithHTML(htmlText);
    })
})
bot.action('add_todo', (ctx) => {
    Stage.enter(addTodo)
}
);

const stage = new Stage([addTodo], {default:'add_todo'});

bot.use(session());
bot.use(stage.middleware());

bot.launch()