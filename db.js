if (!global.__base) {
    /* FOR TESTING PURPOSE ONLY */
    global.__base = require('path').join(__dirname, '../');
}

console.log("Testing");

const mysql = require('mysql');
const utils = require(`${__base}/utils`);
const C = require(`${__base}/constants`);
const config = {
    databases: {
        default: {
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'mydatabase1',
            timezone: 'utc'
        },
        users: {
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'users_database',
            timezone: 'utc'
        }
    },
    settings: {
        timeout: 30000
    }
};

const Db = (function () {

    let errors = [];
    
    /**
     * This function will return connection object
     * @param {String} name This parameter is specifying the database configuration name
     */
    function _getConnection(name) {


        let defer = utils.async.defer();

        let configuration = typeof name === 'string' && config.databases[name] ? config.databases[name] : name;

        if (!configuration) {
            defer.reject({
                type: C.errors.CONFIG_MISSING,
                error: {
                    message: `Configuration with name "${name}" not found!`
                }
            });
            return defer;
        }

        let connection = mysql.createConnection(configuration);
        connection.connect(err => {

            if (err) {
                return defer.reject({
                    type: C.errors.CONNECTION,
                    error: err
                });
            }

            defer.resolve(connection);
        });

        return defer;
    }

    /**
     * This function will return database credentials object
     * @param {String} connectionName This parameter is specifying database configuration name
     */

    function _getCredentials(connectionName) {
        return config.databases[connectionName] ? config.databases[connectionName] : null;
    }

    /**
     * This function is used to execute the START TRANSACTION command in mysql
     * @param {Object} connection The parameter is providing the open connection to the database
     */
    function _startT(connection) {

        let defer = utils.async.defer();

        connection.beginTransaction(err => {
            if (err) {
                return defer.reject({
                    type: C.errors.BEGIN_TRANSACTION,
                    error: err
                });
            }
            return defer.resolve(true);
        });

        return defer;
    }

    /**
     * This function is used to complete the transaction process in mysql with a COMMIT or ROLLBACK command
     * @param {Object} connection The parameter is providing the open connection to the database
     * @param {String} flag The parameter is defining if the transaction should rollback or be commited
     */
    function _endT(connection, flag) {

        let defer = utils.async.defer();
        let transactionMethod = flag ? 'commit' : 'rollback';

        if (!connection) {
            defer.resolve(true);
        } else {
            connection[transactionMethod](err => {
                if (err) {
                    return defer.reject({
                        type: C.errors.END_TRANSACTION,
                        error: err
                    });
                }
                return defer.resolve(true);
            });
        }

        return defer;
    }

    /**
     * This function is used to execute a query in the database and to return all results from the query
     * @param {Object} conn This parameter is defining the connection to the database
     * @param {String} sql This parameter is providing the sql query that needs to be executed
     * @param {Array} params This parameter contains all fields that need to be escaped
     * @param {Number} timeout This parameter is specifying the connection timeout the server will wait to make a connection to the database
     */
    function _query(conn, sql, params, timeout) {

        let defer = utils.async.defer();

        conn.query({
            sql: sql,
            values: params,
            timeout: timeout || config.settings.timeout
        }, function (err2, results, fields) {

            if (err2) {
                return defer.reject({
                    type: C.errors.QUERY,
                    error: err2
                });
            }

            defer.resolve({ data: results, fields: fields });
        });

        return defer;
    }

    /**
     * This function is returning all errors that have appeard
     */
    function _getErrors() {
        return errors;
    }

    /**
     * This function is used to return the last error that was encountered
     */
    function _getLastError() {
        return errors[errors.length] || null;
    }

    /**
     * This function is clearing the errors array from any previously encountered problems
     */
    function _clearErros() {
        errors = [];
        return this;
    }

    /**
     * This function is ending the connection that has been opened to the database
     * @param {Object} conn This parameter is providing the connection to the database
     */
    function _disconnect(conn) {

        let defer = utils.async.defer();

        if (!conn) {
            defer.resolve(true);
        } else {
            conn.end(err => err ? defer.reject(err) : defer.resolve(true));
        }

        return defer;
    }

    /**
     * This function is returning the connection state to the database
     * @param {Object} connection This parameter is specifying the connection to the database
     */
    function _isConnected(connection) {
        return connection && connection.state && ['connected', 'authenticated'].indexOf(connection.state) !== -1;
    }

    return {
        isConnected: _isConnected,
        getConnection: _getConnection,
        getCredentials: _getCredentials,
        startT: _startT,
        endT: _endT,
        getErrors: _getErrors,
        getLastError: _getLastError,
        clearErros: _clearErros,
        query: _query,
        disconnect: _disconnect
    }

})();


exports = module.exports = Db;





