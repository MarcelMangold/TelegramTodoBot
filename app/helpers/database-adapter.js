const { databaseConnection } = require('../config/config');
const logger = require('.logger');
const { Pool } = require('pg')
const pool = new Pool(databaseConnection)
var methods = {};

methods.executeQuery = function (query) {
    const client = new Client(databaseConnection);
    return new Promise(async (resolve, reject) => {
        try {
            await client.connect();
            const res = await client.query(queryConfig);
            await client.end();
            resolve(res);
        } catch (err) {
            logger.error('executePreparedStatement: ' + JSON.stringify(err) + ' - queryConfig:' + queryConfig.text);
            reject(err + ', SQL-Statement: ' + queryConfig.text);
        }
    });
}


module.exports = methods;