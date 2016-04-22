'use strict';

import { join, resolve } from 'path';
import merge from 'lodash.merge';

const _config = {
  debug: process.env.NODE_ENV !== 'production',
  staticPath: join(__dirname, '../public'),
  viewPath: join(__dirname, '../views'),
  keys: ['auth', 'center'],
  session: {
    key: 'sid'
  },
  domain: '__domain__',
  logo: '/57e096d191e00d4baacf303782a23c8d.png',
  emailCodeTTL: 3 * 60 * 60,
  // I18N config
  messages: {},
  // OAuth config
  isTOTP: true,
  codeTTL: 10 * 60,
  accessTokenTTL: 60 * 60,
  // ORM config
  orm: {
    db: ':memory:',
    dialect: 'sqlite',
    modelPath: join(__dirname, 'models')
  },
  // Mail config
  mail: {
    templates: {
      password_reset: {
        subject: 'Please reset your password',
        html: '<p>Hello, <strong>{{username}}</strong>, we heard that you lost your password. Sorry about that!<br>' +
          'But don’t worry! You can use the following link to reset your password:</p>' +
          '<p><a href="{{link}}">{{link}}</a></p>' +
          '<p>If you don’t use this link within {{ttl}} hours, it will expire.</p>' +
          '<p>Thanks!</p>'
      },
      send_totp: {
        subject: '[Important] The key of the dynamic password',
        html: '<p>Hello, <strong>{{username}}</strong>, following image is the key for dynamic password.</p>' +
          '<p><img src="cid:{{cid}}"/></p>' +
          '<p>You should download <strong>Google Authenticator</strong> to use it.</p>' +
          '<p>iOS App: <a href="https://itunes.apple.com/cn/app/google-authenticator/id388497605?mt=8">https://itunes.apple.com/cn/app/google-authenticator/id388497605?mt=8</a><br>' +
          'Android App: <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en">https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en</a><br>' +
          'Install Help: <a href="https://support.google.com/accounts/answer/1066447?hl=en">https://support.google.com/accounts/answer/1066447?hl=en</a></p>' +
          '<p>Thanks!</p>'
      }
    }
  },
  routes: {
    home: '/',
    users: '/users',
    clients: '/clients',
    send_totp: '/send_totp',
    add_client: '/add_client',
    generate_secret: '/generate_secret',
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
    const customConfig = require(resolve(param));
    merge(_config, customConfig);
  }

  if (typeof param === 'object') {
    merge(_config, param);
  }

  return _config;
}
