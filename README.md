Auth Center (OAuth2.0 + TOTP)
===

[![NPM version](https://img.shields.io/npm/v/auth-center.svg)](https://www.npmjs.com/package/auth-center)
[![NPM downloads](https://img.shields.io/npm/dm/auth-center.svg)](https://www.npmjs.com/package/auth-center)
[![Build Status](https://travis-ci.org/d-band/auth-center.svg?branch=master)](https://travis-ci.org/d-band/auth-center)
[![Coverage Status](https://coveralls.io/repos/github/d-band/auth-center/badge.svg?branch=master)](https://coveralls.io/github/d-band/auth-center?branch=master)
[![Dependency Status](https://david-dm.org/d-band/auth-center.svg)](https://david-dm.org/d-band/auth-center)

### 安装

```
// 全局安装
npm i auth-center -g
// 非全局安装
npm i auth-center -S
```

### 功能列表


- 配置方便、简单，UI简洁
- 多数据库支持：MySQL、Postgres、sqlite、mariadb
- session支持redis等
- OAuth2.0 授权码模式
- 密码验证增强（TOTP）
- 自带后台管理

### 使用说明

> 完整配置文件参考：[config.js](./src/config.js)

#### 1. 采用命令行执行

```
$ auth-center -h

  Usage: auth-center [options] [command]


  Commands:

    init              init config
    start [options]   start server

  Options:

    -h, --help     output usage information
    -v, --version  output the version number

$ auth-center init

$ auth-center start -h

  Usage: auth-center start [options]

  start server

  Options:

    -h, --help         output usage information
    -p, --port <port>  server port
    --config <path>    custom config path
    --sync             sync database to generate tables
    --data <path>      init data with json file
    
```

#### 2. 采用引入方式执行

```
const AuthServer = require('auth-server');

const server = AuthServer({
  domain: 'http://passport.example.com',
  orm: {
    db: 'db_auth',
    username: 'root',
    password: 'xxxx',
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

server.listen(3000);

server.orm.database().sequelize.sync({
  force: true
});
```

### 参考链接

- https://github.com/oauthjs/express-oauth-server
- https://github.com/jaredhanson/oauth2orize
- https://tools.ietf.org/html/rfc6749#section-4
- https://tools.ietf.org/html/rfc6750
- http://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html
- https://developer.github.com/v3/oauth/
- https://github.com/guyht/notp
