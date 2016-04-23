'use strict';
/*Redis*/const redisStore = require('koa-redis');/*Redis*/
module.exports = {
  /*MySQL*/orm: {
    dialect: 'mysql',
    database: 'db_auth',
    username: 'root',
    password: null,
    host: '127.0.0.1',
    port: 3306,
    pool: {
      maxConnections: 5,
      maxIdleTime: 3000
    }
  },/*MySQL*/
  /*PostgreSQL*/orm: {
    dialect: 'postgres',
    database: 'db_auth',
    username: 'postgres',
    password: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    pool: {
      maxConnections: 5,
      maxIdleTime: 3000
    }
  },/*PostgreSQL*/
  /*MariaDB*/orm: {
    dialect: 'mariadb',
    database: 'db_auth',
    username: 'root',
    password: null,
    host: '127.0.0.1',
    port: 3306,
    pool: {
      maxConnections: 5,
      maxIdleTime: 3000
    }
  },/*MariaDB*/
  /*MSSQL*/orm: {
    dialect: 'mssql',
    database: 'db_auth',
    username: 'sa',
    password: '123456',
    host: '127.0.0.1',
    port: 1433,
    pool: {
      maxConnections: 5,
      maxIdleTime: 3000
    }
  },/*MSSQL*/
  /*Redis*/session: {
    store: redisStore({
      host: '127.0.0.1',
      port: 6379
    })
  },/*Redis*/
  domain: '__domain__',
  logo: '__logo__'
};
