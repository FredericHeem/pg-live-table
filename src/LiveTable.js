import _ from 'lodash';
import {EventEmitter} from 'events';
let pg = require('pg');
import triggerTemplate from './TriggerTpl';

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
    let waitingPayloads = {};
    return {
        query,
        connect,
        async listAllTables(){
            let listAllTables = `
                SELECT c.relname As tablename
                FROM pg_catalog.pg_class c
                     LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind IN ('r')
                      AND n.nspname <> 'pg_catalog'
                      AND n.nspname <> 'information_schema'
                      AND n.nspname !~ '^pg_toast'
                  AND pg_catalog.pg_table_is_visible(c.oid);`;
            let result = await query(listAllTables);
            log.debug(`listAllTables: ${JSON.stringify(result)}`);
            return _.map(result.rows, row => row.tablename);
        },
        async listen() {
            await query(`LISTEN "${channel}"`);
            let client = await getClient();
            client.on('notification', onNotification);
        },
        async monitor(tableName) {
            if(tableMap.has(tableName)){
                throw Error(`table ${tableName} already exist`);
            }
            let table = Table(tableName);
            tableMap.set(tableName, table);

            await createTableTrigger(tableName, channel);
            return table.ee;
        },

        async version() {
            log.debug(`version`);
            return query("select version()");
        },
        async close(){
            log.debug("close");
            for(let table of tableMap.values()) {
                table.ee.removeAllListeners();
            };
            tableMap.clear();
            let client = await getClient();
            client.end();
        }
    };

    function convertOp(op){
        return op.toLowerCase();
    }

    function processNotification(payload) {
      var argSep = [];

      // Notification is 4 parts split by colons
      while(argSep.length < 3) {
        let lastPos = argSep.length !== 0 ? argSep[argSep.length - 1] + 1 : 0;
        argSep.push(payload.indexOf(':', lastPos));
      }

      let msgHash   = payload.slice(0, argSep[0]);
      let pageCount = payload.slice(argSep[0] + 1, argSep[1]);
      let curPage   = payload.slice(argSep[1] + 1, argSep[2]);
      let msgPart   = payload.slice(argSep[2] + 1, argSep[3]);
      let fullMsg;
      //log.debug(`msgHash: ${msgHash}, pageCount: ${pageCount} curPage: ${curPage} ${msgPart.length}`)

      if(curPage < 1){
          log.error("the incoming message is not well formated, check the trigger function");
          return;
      };

      if(pageCount > 1) {
        if(!(msgHash in waitingPayloads)) {
          waitingPayloads[msgHash] =
            _.range(pageCount).map(function() { return null; });
        }

        waitingPayloads[msgHash][curPage - 1] = msgPart;

        if(waitingPayloads[msgHash].indexOf(null) !== -1) {
          return null;
        }

        fullMsg = waitingPayloads[msgHash].join('');

        delete waitingPayloads[msgHash];
      }
      else {
        fullMsg = msgPart;
      }

      return fullMsg;
    }
    function onNotification(info){
        if (info.channel === channel) {
            try {
                //log.debug(`notification info: ${JSON.stringify(info, null, 4)}`);
                let payloadRaw = processNotification(info.payload);
                //log.debug(`${payloadRaw}`);
                if(!payloadRaw){
                    return;
                }
                let payload = JSON.parse(payloadRaw);
                let table = tableMap.get(payload.table);
                if(table){
                    //log.debug(`notification payload: ${JSON.stringify(payload, null, 4)}`);
                    table.ee.emit(convertOp(payload.op), payload);
                } else {
                    log.error(`table not registered: ${payload.table}`);
                }
            } catch (error) {
                log.error(`onNotification: ${error}`);
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
            log.error("query: ", error);
            throw error;
        }
    }
    async function createTableTrigger(table, channel) {
        log.debug(`createTableTrigger table: ${table} channel: ${channel}`);
        let triggerName = `${channel}_${table}`;
        //log.error(triggerTemplate(triggerName, channel));

        await query(
            triggerTemplate(triggerName, channel));

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
