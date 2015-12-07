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
        console.log(`version ${version}`);
      } catch(error){
        console.log(`error ${error}`);
        assert(false);
      }
    });
    it('monitor one table', async(done) => {
      try {
        let liveTable = LiveTable(options);
        let ee = await liveTable.monitor(tableName);
        ee.on('insert', (newRow) => {
          console.log(`GOT insert`);
          assert(newRow);
          done();
        });
        await liveTable.listen();
        await knex(tableName).insert({ledgerseq: '1'});
      } catch(error){
        console.log(`error ${error}`);
        assert(false);
      }
    });
  });
});
