'use strict';

const join = require('path').join;
const App = require('./app');


const app = App({
  debug: true,
  staticPath: join(__dirname, 'public'),
  viewPath: join(__dirname, 'views'),
  emailCodeTTL: 60 * 60,
  codeTTL: 10 * 60,
  accessTokenTTL: 60 * 60,
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
    },
    modelPath: join(__dirname, 'app/models')
  }
});

/** Start **/
if (!module.parent) {
  app.listen(3000);
  app.orm.database().sequelize.sync();
  console.log(`Running site at: http://127.0.0.1:3000`);
}