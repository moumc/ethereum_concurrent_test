
module.exports = {

    appenders: {
        users: {
            type: "dateFile",
            filename: "./logs/user.log",
            pattern: "-yyyy-MM-dd",
            category: "users",
            maxLogSize: 104857600,
            numBackups: 3
        },
        errorFile: {
            type: "file",
            filename: "./logs/errors.log"
        },
        errors: {
            type: "logLevelFilter",
            level: "ERROR",
            appender: "errorFile"
        }
    },
    categories: {
        default: { appenders: [ "users", "errors" ], level: "DEBUG" },
        server: { appenders: [ "users", "errors"], level: "DEBUG" }
    },

    mysql:{
        host: "192.168.6.160",
        user: "root",
        password: "123456",
        database: "blockchain",
        port: "3306"
    }
}