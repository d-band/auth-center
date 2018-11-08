'use strict';

const AuthServer = require('../app');
const resolve = require('path').resolve;
const { existsSync } = require('fs');

module.exports = function(options) {
  const configPath = options.config || 'config.js';
  const port = options.port || 3000;
  let server;

  if (existsSync(configPath)) {
    server = AuthServer(configPath);
  } else {
    server = AuthServer();
  }

  server.listen(port);

  console.log('Running site at: http://127.0.0.1:' + port);

  async function init() {
    const { sync, User } = server.orm.database();

    if (options.sync) {
      await sync({ force: true });
      console.log('sync done.');
    }

    if (options.data && existsSync(options.data)) {
      const data = require(resolve(options.data));
      const users = data.users || [];

      for (let user of users) {
        await User.add(user);
      }

      console.log('load data done.');
    }
  }

  init().catch((err) => {
    console.log(err.stack || err);
  });
};
