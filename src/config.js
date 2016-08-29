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
  emailInitCodeTTL: 48 * 60 * 60,
  // I18N config
  messages: {},
  // OAuth config
  isTOTP: true,
  codeTTL: 10 * 60,
  accessTokenTTL: 60 * 60,
  // ORM config
  orm: {
    database: ':memory:',
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
        subject: '[Important] The key of the dynamic token',
        html: '<p>Hello, <strong>{{username}}</strong>, following image is the key for dynamic token.</p>' +
          '<p><img src="cid:{{cid}}"/></p>' +
          '<p>Or you can use following email and secret key to register :</p>' +
          '<p>Email: {{email}}<br>Secret Key: {{key}}</p>' +
          '<p>You should download <strong>Google Authenticator</strong> to use it.</p>' +
          '<p>iOS App: <a href="https://itunes.apple.com/cn/app/google-authenticator/id388497605?mt=8">https://itunes.apple.com/cn/app/google-authenticator/id388497605?mt=8</a><br>' +
          'Android App: <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en">https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en</a><br>' +
          'Install Help: <a href="https://support.google.com/accounts/answer/1066447?hl=en">https://support.google.com/accounts/answer/1066447?hl=en</a></p>' +
          '<p>Thanks!</p>'
      },
      add_user: {
        subject: 'Welcome to join CNOOD',
        html: '<p>Hello, <strong>{{username}}</strong>. This is an instruction email, please finish the following steps.</p>' +
          '<p>1. Set your CNOOD system password.</p>' +
          '<p>You can use the following link to initialize your password:</p>' +
          '<p><a href="{{link}}">{{link}}</a></p>' +
          '<p>If you don’t use this link within {{ttl}} hours, it will expire.</p>' +
          '<p>2. Get your CNOOD system dynamic token.</p>' +
          '<p>Firstly you should download <strong>Google Authenticator</strong> to use it.</p>' +
          '<p>iOS App: <a href="https://itunes.apple.com/cn/app/google-authenticator/id388497605?mt=8">https://itunes.apple.com/cn/app/google-authenticator/id388497605?mt=8</a><br>' +
          'Android App: <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en">https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en</a><br>' +
          'Install Help: <a href="https://support.google.com/accounts/answer/1066447?hl=en">https://support.google.com/accounts/answer/1066447?hl=en</a></p>' +
          '<p>The following image is the key for dynamic token.</p>' +
          '<p><img src="cid:{{cid}}"/></p>' +
          '<p>Or you can use following email and secret key to register :</p>' +
          '<p>Email: {{email}}<br>Secret Key: {{key}}</p>' +
          '<p>Thanks!</p>'
      }
    }
  },
  routes: {
    home: '/',
    users: '/users',
    search_user: '/search_user',
    clients: '/clients',
    roles: '/roles',
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
    access_token: '/access_token',
    add_user: '/add_user',
    password_init: '/password_init',
    add_role: '/add_role',
    delete_role: '/delete_role'
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

  if (!_config.orm.dialectModulePath) {
    let modulePath = join(process.cwd(), 'node_modules');
    let moduleName = ({
      sqlite: 'sqlite3',
      mysql: 'mysql',
      mariadb: 'mysql',
      postgres: 'pg',
      mssql: 'tedious'
    })[_config.orm.dialect];

    _config.orm.dialectModulePath = require.resolve(join(modulePath, moduleName));
  }

  if (!_config.orm.logging) {
    _config.orm.logging = _config.debug && console.log;
  }
  return _config;
}
