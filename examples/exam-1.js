'use strict';

const AuthServer = require('auth-server');

const server = AuthServer({
  debug: true,
  domain: 'http://passport.example.com',
  orm: {
    db: 'db_auth',
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
  const port = 3000;

  server.listen(port);
  console.log(`Running site at: http://127.0.0.1:${port}`);
  // Sync Database to generate tables
  server.orm.database().sequelize.sync({
    force: true
  });
}
