'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports['default'] = LiveTable;

function LiveTable(options, logOptions) {
    if (options === undefined) options = {};

    var log = require('logfilename')(__filename, logOptions);
    log.error('LiveTable');
}

module.exports = exports['default'];