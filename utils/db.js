const config = require('../config/config');

const knex = require('knex')({
    client: 'mysql',
    connection: {
        host : config.mysql.host,
        port: config.mysql.port,
        user : config.mysql.user,
        password : config.mysql.password,
        database : config.mysql.database
    }
});

module.exports = knex;