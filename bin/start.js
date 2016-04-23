'use strict';

const AuthServer = require('../app');
const existsSync = require('fs').existsSync;

module.exports = function(options) {
  let configPath = options.config || 'config.js';
  let port = options.port || 3000;
  let server;

  if (existsSync(configPath)) {
    server = AuthServer(configPath);
  } else {
    server = AuthServer();
  }

  server.listen(port);

  console.log('Running site at: http://127.0.0.1:' + port);

  co(function*() {
    let orm = server.orm.database();

    if (options.sync) {
      yield orm.sequelize.sync({
        force: true
      });

      console.log('sync done.');
    }

    if (options.data && existsSync(options.data)) {
      let data = require(resolve(options.data));
      let users = data.users || [];

      for (let user of users) {
        yield orm.User.add(user);
      }

      console.log('load data done.');
    }
  }).catch(function(err) {
    console.log(err.stack || err);
  });
};
