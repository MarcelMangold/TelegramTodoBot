const { databaseConnection } = require('../config/config');
const logger = require('./logger');
const { Pool, Client } = require('pg')
const pool = new Pool(databaseConnection)
var methods = {};

methods.executeQuery = function (text, values) {
    const client = new Client(databaseConnection);
    return new Promise(async (resolve, reject) => {
        try {
            await client.connect();
            const res = await client.query(text, values);
            await client.end();
            resolve(res);
        } catch (err) {
            logger.error('executePreparedStatement: ' + JSON.stringify(err) + ' - queryConfig:' + text + "- values:" + values);
            reject(err + ', SQL-Statement: ' + text);
        }
    });
}


module.exports = methods;