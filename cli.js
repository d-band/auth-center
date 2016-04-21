#!/usr/bin/env node
'use strict';

var program = require('commander');
var AuthServer = require('./app');
var existsSync = require('fs').existsSync;

program
  .version(require('./package').version, '-v, --version')
  .option('-p, --port <port>', 'port, default 3000')
  .option('--sync', 'sync database')
  .option('--config <path>', 'custom config path')
  .parse(process.argv);

var server;

if (program.config && existsSync(program.config)) {
  server = AuthServer(program.config);
} else {
  server = AuthServer();
}

/** Start **/
if (!module.parent) {
  var port = program.port || 3000;

  server.listen(port);

  console.log('Running site at: http://127.0.0.1:' + port);

  // Sync Database to generate tables
  program.sync && server.orm.database().sequelize.sync({
    force: true
  });
}