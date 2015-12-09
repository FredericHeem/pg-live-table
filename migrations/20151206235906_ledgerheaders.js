
exports.up = function(knex, Promise) {
    return Promise.all([
      knex.schema.createTable("ledgerheaders", function (table) {
        table.increments(); // integer id

        table.timestamp("created_at").defaultTo(knex.raw('now()')).notNullable();

        // It's null if the list is public
        table.integer("ledgerseq");
        table.text('longname', 'longtext');
      })
    ]);
};

exports.down = function(knex, Promise) {
    return Promise.all([
      knex.schema.dropTable("ledgerheaders")
    ]);
};
