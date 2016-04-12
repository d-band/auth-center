'use strict';

const join = require('path').join;
const App = require('./app');


const app = App({
  debug: true,
  staticPath: join(__dirname, 'public'),
  viewPath: join(__dirname, 'views'),
  orm: {
    db: 'auth_db',
    username: 'root',
    password: '',
    // Supported: 'mysql', 'sqlite', 'postgres', 'mariadb'
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    pool: {
      maxConnections: 10,
      minConnections: 0,
      maxIdleTime: 30000
    }
  }
});

/** Start **/
if (!module.parent) {
  app.listen(3000);
  console.log(`Running site at: http://127.0.0.1:3000`);
}
