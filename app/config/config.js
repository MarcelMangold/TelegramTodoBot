require('dotenv').config();//instatiate environment variables

let CONFIG = {}

CONFIG.databaseConnection =  { 
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT
}

CONFIG.botToken = process.env.BOT_TOKEN

module.exports = CONFIG;