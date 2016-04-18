'use strict';

import { join } from 'path';
import merge from 'lodash.merge';

const _config = {
  debug: process.env.NODE_ENV !== 'production',
  staticPath: join(__dirname, '../public'),
  viewPath: join(__dirname, '../views'),
  keys: ['auth', 'center'],
  domain: '__domain__',
  emailCodeTTL: 3 * 60 * 60,
  // I18N config
  messages: {},
  // OAuth config
  codeTTL: 10 * 60,
  accessTokenTTL: 60 * 60,
  // ORM config
  orm: {
    db: 'db_auth',
    dialect: 'sqlite'
  },
  // Mail config
  mail: {
    templates: {
      password_reset: {
        subject: 'Please reset your password',
        html: '<p>Hello, <strong>{{username}}</strong>, we heard that you lost your GitHub password. Sorry about that!</p>' +
          '<p>But don’t worry! You can use the following link to reset your password:</p>' +
          '<p><a href="{{link}}">{{link}}</a></p>' +
          '<p>If you don’t use this link within {{ttl}} hours, it will expire.</p>' +
          '<p>Thanks!</p>'
      }
    }
  },
  routes: {
    home: '/',
    users: '/users',
    clients: '/clients',
    login: '/login',
    logout: '/logout',
    password_reset: '/password_reset',
    password_change: '/password_change',
    session: '/session',
    user: '/user',
    authorize: '/authorize',
    access_token: '/access_token'
  }
};

export default function(param) {
  if (typeof param === 'string') {
    const customConfig = require(param);
    merge(_config, customConfig);
  }

  if (typeof param === 'object') {
    merge(_config, param);
  }

  return _config;
}
