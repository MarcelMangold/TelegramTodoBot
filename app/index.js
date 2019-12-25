const { botToken, databaseConnection } = require('./config/config');
const logger = require('./helpers/logger');
const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const WizardScene = require("telegraf/scenes/wizard");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const Keyboard = require('telegraf-keyboard');

const { Pool } = require('pg')
const pool = new Pool(databaseConnection)



const bot = new Telegraf(botToken)

bot.catch((err, ctx) => {
    console.log(`Ooops, ecountered an error for ${ctx.updateType}`, err)
    logger.error(`Ooops, ecountered an error for ${ctx.updateType}`, err)
})

bot.start(
    (ctx) => ctx.reply(
        /*         `How can I help you, ${ctx.from.first_name}?`,
                Markup.inlineKeyboard(
                    [
                        Markup.callbackButton("add", "add_todo"),
                        Markup.callbackButton("show list", "SHOW_LIST"),
                        Markup.callbackButton("set item(s) to done", "DONE")
                    ]
                ).extra()*/
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
            console.log(err);

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

bot.command('show', async (ctx) => {
    let chatId = ctx.update.message.chat.id;
    const checkIfChatExist = {
        text: 'SELECT * FROM todo.chat where id= $1',
        values: [chatId]
    }
    const addChat = {
        text: 'INSERT INTO todo.chat (id) VALUES ($1)',
        values: [chatId]
    }

    let response = await pool.query(checkIfChatExist);
    if (response.rowCount == 0) {
        pool.query(addChat, (err, res) => {
            if (err) {
                throw err
            }
        })
        ctx.replyWithHTML('<b>Currently there are no open todos</b>');
    }
    else {
        const query = {
            text: 'SELECT * FROM todo.todo WHERE todo.chat_id = $1 AND todo.is_finished = $2',
            values: [chatId, false]
        }
        try {
            pool.query(query, (err, res) => {
                if (err) {
                    throw err;
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
        } catch (err) {
            logger.error(err.error);
            ctx.replyWithHTML("Error while reading todos");
        };
    }

})

bot.command('done', (ctx) => {
    const query = {
        text: 'SELECT * FROM todo.todo WHERE todo.chat_id = $1 AND todo.is_finished = $2',
        values: [ctx.update.message.chat.id, false]
    }
    pool.query(query, (err, res) => {
        if (err) {
            throw err
        }
        const options = {
            inline: true, // default
            duplicates: false, // default
            newline: false, // default
        };

        const keyboard = new Keyboard(options);
        let row = [];
        let rows = [];
        let columnCount = 0;
        for (let i = 0; i < res.rows.length; i++) {
            ++columnCount;
            let string = res.rows[i].name + ":action" + res.rows[i].id;

            row.push(string)
            if (columnCount == 2) {
                rows.push(row);
                row = [];
                columnCount = 0;
            }

        };
        rows.forEach(element => {
            keyboard
                .add(element)
        });

        ctx.reply('Open todos (to set a todo as done, click on it):', keyboard.draw());
    })
})

const regex = new RegExp('action[0-9]');

bot.action(regex, (ctx) => {
    let actionData = ctx.update.callback_query.data;
    let rows = ctx.update.callback_query.message.reply_markup.inline_keyboard;
    let selectedItem = null;

    rows.forEach(row => {
        row.forEach(column => {
            if (column.callback_data == actionData) {
                selectedItem = column.text;
                return;
            }
        });
        if (selectedItem != null)
            return
    });



    const query = {
        text: 'UPDATE todo.todo SET is_finished=true WHERE id = $1',
        values: [actionData.replace("action", "")]
    }
    pool.query(query, (err, res) => {
        if (err) {
            throw err
        }
        if (res.rowCount == 1)
            ctx.reply(`${selectedItem} is done`);
        else
            ctx.reply(`Error when setting the value ${selectedItem} as done`);
    });




}
);

bot.action('add_todo', (ctx) => {
    Stage.enter(addTodo)
}
);

const stage = new Stage([addTodo]);

bot.use(session());
bot.use(stage.middleware());

bot.launch()