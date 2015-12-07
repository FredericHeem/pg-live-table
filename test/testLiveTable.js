import assert from 'assert';
import 'mochawait';

var LiveTable = require('../src/');

describe('LiveTable', function() {
  this.timeout(30e3);
  let dbUrl = 'postgres://localhost/livetable_test';
  let log = require('logfilename')(__filename, {
    console: {
      level: 'debug'
    }
  });

  log.debug('');

  let knex = require('knex')({
    debug: true,
    client: 'pg',
    connection: dbUrl,
    searchPath: 'public'
  });

  before(async () => {
      await knex.migrate.latest();
  });

  describe('db connection', function() {
    let options = {
      dbUrl: dbUrl
    };
    it('connect', async() => {
      let liveTable = LiveTable(options);
      await liveTable.connect();
    });
  });
  describe('db connection', function() {
    let tableName = 'ledgerheaders';
    let options = {
      dbUrl: dbUrl
    };
    it('get postgres version', async() => {
      try {
        let liveTable = LiveTable(options);
        let version = await liveTable.version();
        assert(version);
        console.log(`version ${JSON.stringify(version)}`);
      } catch(error){
        console.log(`error ${error}`);
        assert(false);
      }
    });
    it('monitor new row', async(done) => {
      try {
        let liveTable = LiveTable(options);
        let ee = await liveTable.monitor(tableName);
        ee.on('insert', (payload) => {
          console.log(`GOT insert: data: ${payload.data}`);
          assert(payload);
          assert(payload.data);
          done();
        });
        await liveTable.listen();
        await knex(tableName).insert({ledgerseq: '1'});
      } catch(error){
        console.log(`error ${error}`);
        assert(false);
      }
    });
    it('monitor update', async(done) => {
      try {
        let liveTable = LiveTable(options);
        let ee = await liveTable.monitor(tableName);
        ee.on('update', (data) => {
          console.log(`GOT data: ${data}`);
          assert(data.new_data);
          assert(data.old_data);
          done();
        });
        await liveTable.listen();
        await knex(tableName).update({ledgerseq: '2'}).where({id:1});
      } catch(error){
        console.log(`error ${error}`);
        assert(false);
      }
    });
  });
});
