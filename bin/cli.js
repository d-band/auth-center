'use strict';

var program = require('commander');

program
  .version(require('../package').version, '-v, --version');

program
  .command('init')
  .description('init config')
  .action(require('./init'));

program
  .command('start')
  .description('start server')
  .option("-p, --port <port>", "server port")
  .option('--config <path>', 'custom config path')
  .option("--sync", "sync database to generate tables")
  .option("--data <path>", "init data with json file")
  .action(require('./start'));

program.parse(process.argv);