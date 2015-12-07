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
    debug: false,
    client: 'pg',
    connection: dbUrl,
    searchPath: 'public'
  });

  before(async () => {
    await knex.migrate.rollback();
  });

  beforeEach(async () => {
    await knex.migrate.latest();
  });

  afterEach(async () => {
    await knex.migrate.rollback();
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
  describe('insert - update - delete: ', function() {
    let tableName = 'ledgerheaders';
    let options = {
      dbUrl: dbUrl
    };
    let liveTable;
    beforeEach(async () => {
      liveTable = LiveTable(options);
    });

    afterEach(async () => {
      await liveTable.close();
    });
    it('get postgres version', async() => {
      try {
        let version = await liveTable.version();
        assert(version);
        console.log(`version ${JSON.stringify(version)}`);
      } catch(error){
        console.log(`error ${error}`);
        assert(false);
      }
    });
    it('monitor all', async(done) => {
      try {
        let ee = await liveTable.monitor(tableName);
        ee.on('insert', (payload) => {
          console.log(`GOT insert: data: ${payload.data}`);
          assert(payload);
          assert(payload.data);
          //TODO use spy
        });
        ee.on('update', (payload) => {
          let {old_data, new_data} = payload;
          console.log(`GOT update: old: ${old_data}, new: ${new_data}`);
          assert(payload);
          assert(new_data);
          assert.equal(new_data[0].ledgerseq, 2);
          assert(old_data);
          assert.equal(old_data[0].ledgerseq, 1);

          done();
        });
        await liveTable.listen();
        await knex(tableName).insert({ledgerseq: '1'});
        await knex(tableName).update({ledgerseq: '2'}).where({id:1});

      } catch(error){
        console.log(`error ${error}`);
        assert(false);
      }
    });
    it('monitor insert', async(done) => {
      try {
        let ee = await liveTable.monitor(tableName);
        ee.on('insert', (payload) => {
          console.log(`GOT insert: data: ${payload}`);
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
        let ee = await liveTable.monitor(tableName);
        ee.on('update', (data) => {
          console.log(`GOT data: ${data}`);
          assert(data.new_data);
          assert(data.old_data);
          done();
        });
        await liveTable.listen();
        await knex(tableName).insert({ledgerseq: '1'});
        await knex(tableName).update({ledgerseq: '2'}).where({id:1});
      } catch(error){
        console.log(`error ${error}`);
        assert(false);
      }
    });
  });
});
