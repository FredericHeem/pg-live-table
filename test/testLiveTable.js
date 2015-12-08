require("babel-polyfill");
import assert from 'assert';
import should from 'should';
import 'mochawait';

import LiveTable from '../src/LiveTable';

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
    it('no options', () => {
      (function(){
        LiveTable();
      }).should.throw();
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
    it('monitor the same table twice', async() => {
      try {
        await liveTable.monitor(tableName);
        await liveTable.monitor(tableName);
      } catch(error){
        assert.equal(error.message,`table ${tableName} already exist`);
      }
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
        })
        .on('update', (payload) => {
          let {old_data, new_data} = payload;
          console.log(`GOT update: old: ${old_data}, new: ${new_data}`);
          assert(payload);
          assert(new_data);
          assert.equal(new_data[0].ledgerseq, 2);
          assert(old_data);
          assert.equal(old_data[0].ledgerseq, 1);
        })
        .on('delete', (payload) => {
          let {data} = payload;
          console.log(`GOT delete: data: ${data}`);
          assert(payload);
          assert(data);
          assert.equal(data[0].id, 1);
          done();
        });
        await liveTable.listen();
        await knex(tableName).insert({ledgerseq: '1'});
        await knex(tableName).update({ledgerseq: '2'}).where({id:1});
        await knex(tableName).where({id:1}).del();

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
