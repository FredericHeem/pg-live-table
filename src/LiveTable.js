import {
    EventEmitter
}
from 'events';
let pg = require('pg');

function Table(name) {
    let ee = new EventEmitter();
    return {
        ee,
        name
    };
}

export default function LiveTable(options = {}) {
    let log = require('logfilename')(__filename, options.logOptions);
    let channel = options.channel || 'livetable';
    if (!options.dbUrl) {
        throw Error('missing dbUrl options');
    }
    let client;
    let tableMap = new Map();

    return {
        query,
        connect,
        async listen() {
            log.debug(`LISTEN "${channel}"`);
            await query(`LISTEN "${channel}"`);
            let client = await getClient();
            client.on('notification', onNotification);
        },
        async monitor(tableName) {
            //TODO check for duplicate
            let table = Table(tableName);
            tableMap.set(tableName, table);

            await createTableTrigger(tableName, channel);
            return table.ee;
        },

        async version() {
            log.debug(`version`);
            return query("select version()");
        }
    };

    function convertOp(op){
        switch(op){
            case 'INSERT': return 'insert';
            case 'NEW': return 'new';
            case 'UPDATE': return 'update';
            default:
        }
    }
    function onNotification(info){
        if (info.channel === channel) {
            try {
                let payload = JSON.parse(info.payload);
                log.debug(`notification payload: ${JSON.stringify(payload, null, 4)}`);
                let table = tableMap.get(payload.table);
                if(table){
                    table.ee.emit(convertOp(payload.op), payload.data);
                } else {
                    log.error(`table not registered: ${payload.table}`);
                }
            } catch (error) {
                log.error(`${error}`);
                //TODO
                /*
                return this.emit('error',
                    new Error('INVALID_NOTIFICATION ' + info.payload))
                    */
            }
        } else {
            log.error(`channel not registered: ${channel}`);
        }
    }
    async function connect() {
        log.debug(`connecting to ${options.dbUrl}`);

        return new Promise(function (resolve, reject) {
            pg.connect(options.dbUrl, function (error, client) {
                if (error) {
                    reject(error);
                } else {
                    log.debug(`connected to ${options.dbUrl}`);
                    resolve(client);
                }
            });
        });
    }
    async function getClient(){
        if(!client){
            log.debug(`getClient: creating client`);
            client = await connect();
        };
        return client;
    };
    async function query(command) {
        try {
            log.debug(`query: ${command}`);
            let client = await getClient();
            let params = arguments[2] === undefined ? [] : arguments[2];

            return new Promise(function (resolve, reject) {
                client.query(command, params, function (error, result) {
                    if (error) reject(error);
                    else resolve(result);
                });
            });
        } catch (error) {
            log.error(error);
            throw error;
        }
    }
    async function createTableTrigger(table, channel) {
        log.debug(`createTableTrigger table: ${table} channel: ${channel}`);
        let triggerName = `${channel}_${table}`;

        let payloadTpl = `
            SELECT
                '${table}'  AS table,
                TG_OP       AS op,
                json_agg($ROW$) AS data
            INTO row_data;
        `;
        let payloadNew = payloadTpl.replace(/\$ROW\$/g, 'NEW')
        let payloadOld = payloadTpl.replace(/\$ROW\$/g, 'OLD')
        let payloadChanged = `
            SELECT
                '${table}'  AS table,
                TG_OP       AS op,
                json_agg(NEW) AS new_data,
                json_agg(OLD) AS old_data
            INTO row_data;
        `

        await query(
            `CREATE OR REPLACE FUNCTION ${triggerName}() RETURNS trigger AS $$
                DECLARE
          row_data RECORD;
        BEGIN
          RAISE WARNING '${triggerName}';
          IF (TG_OP = 'INSERT') THEN
            ${payloadNew}
          ELSIF (TG_OP  = 'DELETE') THEN
            ${payloadOld}
          ELSIF (TG_OP = 'UPDATE') THEN
            ${payloadChanged}
          END IF;
          PERFORM pg_notify('${channel}', row_to_json(row_data)::TEXT);
          RETURN NULL;
                END;
            $$ LANGUAGE plpgsql`);

        await query(
            `DROP TRIGGER IF EXISTS "${triggerName}"
                ON "${table}"`);

        await query(
            `CREATE TRIGGER "${triggerName}"
                AFTER INSERT OR UPDATE OR DELETE ON "${table}"
                FOR EACH ROW EXECUTE PROCEDURE ${triggerName}()`);

        return true;
    };
};
