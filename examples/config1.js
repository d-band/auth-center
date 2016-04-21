module.exports = {
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
  }
};
