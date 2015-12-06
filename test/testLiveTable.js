//var assert = require('assert');
import should from 'should';
import 'mochawait';

var LiveTable = require('../src/');

describe('LiveTable', function() {
  'use strict';
  this.timeout(15e3);
  var log = require('logfilename')(__filename, {
    console: {
      level: 'debug'
    }
  });

  log.debug('');

  describe('db connection', function() {

    it('no exchange options', done => {
      done()
    });
  });
});
