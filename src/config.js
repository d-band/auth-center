'use strict';

import { join, resolve } from 'path';
import merge from 'lodash.merge';

const config = {
  proxy: true,
  debug: process.env.NODE_ENV !== 'production',
  staticPath: join(__dirname, '../public'),
  viewPath: join(__dirname, '../views'),
  keys: ['auth', 'center'],
  session: {
    key: 'sid'
  },
  domain: '__domain__',
  logo: '/logo.png',
  favicon: '/logo.png',
  terms: 'https://en.wikipedia.org/wiki/Terms_of_service',
  emailCodeTTL: 3 * 60 * 60,
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
        html: `
          <p>Hello, <strong>{{username}}</strong>, we heard that you lost your password. Sorry about that!<br>
          But don’t worry! You can use the following link to reset your password:</p>
          <p><a href="{{link}}">{{link}}</a></p>
          <p>If you don’t use this link within {{ttl}} hours, it will expire.</p>
          <p>Thanks!</p>
        `
      },
      send_totp: {
        subject: '[Important] The key of the dynamic token',
        html: `
          <p>Hello, <strong>{{username}}</strong>, following image is the key for dynamic token.</p>
          <p><img src="cid:{{cid}}"/></p>
          <p>Or you can use following email and secret key to register :</p>
          <p>Email: {{email}}<br>Secret Key: {{key}}</p>
          <p>You should download <strong>Google Authenticator</strong> to use it.</p>
          <p>iOS App: <a href="https://itunes.apple.com/cn/app/google-authenticator/id388497605?mt=8">https://itunes.apple.com/cn/app/google-authenticator/id388497605?mt=8</a><br>
          Android App: <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en">https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en</a><br>
          Install Help: <a href="https://support.google.com/accounts/answer/1066447?hl=en">https://support.google.com/accounts/answer/1066447?hl=en</a></p>
          <p>Thanks!</p>
        `
      },
      send_token: {
        subject: '{{token}} is your dynamic token',
        html: `
          Dear {{username}}
          <br><br>Your dynamic token is <span style="font-weight: 500; color: #f4364c;">{{token}}</span>. It will be expired in 5 minutes.
          <br><br><br><br>To make sure our emails arrive, please add {{sender}} to your contacts.
        `
      }
    }
  },
  routes: {
    home: '/',
    login: '/login',
    logout: '/logout',
    password_reset: '/password_reset',
    password_change: '/password_change',
    send_token: '/send_token',
    session: '/session',
    user: '/user',
    authorize: '/authorize',
    access_token: '/access_token',
    admin: {
      users: '/admin',
      search_user: '/admin/search_user',
      clients: '/admin/clients',
      roles: '/admin/roles',
      send_totp: '/admin/send_totp',
      add_client: '/admin/add_client',
      generate_secret: '/admin/generate_secret',
      add_role: '/admin/add_role',
      delete_role: '/admin/delete_role'
    }
  }
};

export default function initConfig (param) {
  if (typeof param === 'string') {
    const customConfig = require(resolve(param));
    merge(config, customConfig);
  }

  if (typeof param === 'object') {
    merge(config, param);
  }

  if (!config.orm.dialectModulePath) {
    const modulePath = join(process.cwd(), 'node_modules');
    const moduleName = ({
      sqlite: 'sqlite3',
      mysql: 'mysql2',
      mariadb: 'mysql2',
      postgres: 'pg',
      mssql: 'tedious'
    })[config.orm.dialect];

    config.orm.dialectModulePath = require.resolve(join(modulePath, moduleName));
  }

  if (!config.orm.logging) {
    config.orm.logging = config.debug && console.log;
  }
  return config;
}
