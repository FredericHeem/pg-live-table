

> pg-live-table: Postgres live monitoring

A javascript library to monitor in real time Postgresql database table.

[![Build Status][travis-image]][travis-url]
[![Code Climate](https://codeclimate.com/github/FredericHeem/pg-live-table/badges/gpa.svg)](https://codeclimate.com/github/FredericHeem/pg-live-table) [![Coverage Status](https://coveralls.io/repos/FredericHeem/pg-live-table/badge.svg?branch=master&service=github)](https://coveralls.io/github/FredericHeem/pg-live-table?branch=master) [![NPM version][npm-image]][npm-url]

[![Dependency Status][daviddm-image]][daviddm-url]

## Install

```sh
$ npm install --save pg-live-table
```


## Usage

```js
import PgLiveTable from 'pg-live-table';

let dbUrl = 'postgres://username:password@localhost/database';
let liveTable = PgLiveTable({dbUrl: dbUrl);

let ee = await liveTable.monitor('mytable');
ee.on('insert', (payload) => {
  console.log(`GOT insert: data: ${payload.data}`);
})
.on('update', (payload) => {
  let {old_data, new_data} = payload;
  console.log(`GOT update: old: ${old_data}, new: ${new_data}`);
})
.on('delete', (payload) => {
  console.log(`GOT delete: data: ${payload.data}`);
});

await liveTable.listen();

//When done, don't forget to call liveTable.close()

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
