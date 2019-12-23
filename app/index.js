const { botToken, databaseConnection } = require('./config/config');
const logger = require('./helpers/logger');
const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const WizardScene = require("telegraf/scenes/wizard");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");

const {Client } = require('pg')

const client = new Client(databaseConnection)
client.connect()
client.query('select * from todo.todo', (err, res) => {
    console.log(err);
  console.log(res)
  client.end()
})

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
                Markup.callbackButton("add", "ADD_TODO"),
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
        let test = await ctx.message;
        console.log(test);
        //console.log(ctx.update.callback_query.message);
       // console.log(ctx);
        ctx.wizard.state.item = ctx.message.text;
        ctx.reply(
            `Item "${
            ctx.wizard.state.item
            }" added to the todo list`
        );
        // Go to the following scene
        return ctx.scene.leave();
    }
);


bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))
bot.action('SHOW_LIST', (ctx) => {
    ctx.reply("asd asd")
})
const stage = new Stage([addTodo], {default:'add_todo'});

bot.use(session());
bot.use(stage.middleware());
bot.action('ADD_TODO', (ctx) => {
    console.log("test");
    Stage.enter(addTodo) 
}
); 
bot.launch()