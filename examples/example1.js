'use strict';

const Server = require('../src');

const server = Server({
  debug: true,
  domain: 'http://passport.example.com',
  orm: {
    database: 'auth',
    username: 'root',
    password: '112358',
    // Supported: 'mysql', 'sqlite', 'postgres', 'mariadb'
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    pool: {
      maxConnections: 10,
      minConnections: 0,
      maxIdleTime: 30000
    }
  },
  mail: {
    from: '系统管理员 <admin@example.com>',
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: {
      user: 'admin@example.com',
      pass: 'admin'
    }
  }
});

/** Start **/
if (!module.parent) {
  const port = 8888;

  server.listen(port);
  console.log(`Running site at: http://127.0.0.1:${port}`);
  // Sync Database to generate tables
  server.orm.database().sync({
    force: false
  }).then(() => {
    console.log('Sync done.');
  });
}
