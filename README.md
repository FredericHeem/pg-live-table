

> pg-live-table: Postgres live monitoring

A javascript library to monitor in real time Postgresql database table.

[![Build Status][travis-image]][travis-url]
[![Test Coverage](https://codeclimate.com/github/FredericHeem/pg-live-table/badges/coverage.svg)](https://codeclimate.com/github/FredericHeem/pg-live-table/coverage) [![Code Climate](https://codeclimate.com/github/FredericHeem/pg-live-table/badges/gpa.svg)](https://codeclimate.com/github/FredericHeem/pg-live-table) [![Coverage Status](https://coveralls.io/repos/FredericHeem/pg-live-table/badge.svg?branch=master&service=github)](https://coveralls.io/github/FredericHeem/pg-live-table?branch=master) [![NPM version][npm-image]][npm-url]

[![Dependency Status][daviddm-image]][daviddm-url]

## Install

```sh
$ npm install --save pg-live-table
```


## Usage

```js
import PgLiveTable from 'pg-live-table';

let dbUrl = '';
let pgLiveTable = PgLiveTable(dbUrl);

let table = pgLiveTable.monitor('transactions')
.onUpdate((oldRow, newRow) => {
  console.log(`update: ${oldRow}, ${newRow}`);
});
.onNew((newRow) => {
  console.log(`new: ${oldRow}`);
});
.onDelete((deletedRow) => {
  console.log(`deleted: ${deletedRow}`);
});

```

## Test

Make sure Postgres is running locally before running the test

    $ npm test

## License

MIT © [Frederic Heem](https://github.com/FredericHeem)


[npm-image]: https://badge.fury.io/js/pg-live-table.svg
[npm-url]: https://npmjs.org/package/pg-live-table
[travis-image]: https://travis-ci.org/FredericHeem/pg-live-table.svg?branch=master
[travis-url]: https://travis-ci.org/FredericHeem/pg-live-table
[daviddm-image]: https://david-dm.org/FredericHeem/pg-live-table.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/FredericHeem/pg-live-table
