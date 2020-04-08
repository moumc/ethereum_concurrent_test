'use strict';

/**
 * Module dependencies
 */

const log4js = require('log4js');
const config = require('../config/config');

log4js.configure(config);
var dateFileLog = log4js.getLogger('server');

function Loger(categ = 'server') {
    this.categ = categ;
}

Loger.logger = dateFileLog;

Loger.use = function (app) {
    //app.use(log4js.connectLogger(dateFileLog, {level:'INFO', format:':method :url'}));
    app.use(log4js.connectLogger(dateFileLog, { level: 'auto', format: ':method :url' }));
};

Loger.prototype.logger = function () {
    return log4js.getLogger(this.categ);
};

module.exports = Loger;