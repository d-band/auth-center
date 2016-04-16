'use strict';

import Router from 'koa-router';
import OAuth from './oauth';
import * as user from './controllers/user';
import * as admin from './controllers/admin';

function * csrf(next) {
  this.assertCSRF(this.request.body);
  yield next;
}

export default function routes(app, config) {
  const R = Object.assign({
    home: '/',
    clients: '/clients',
    login: '/login',
    password_reset: '/password_reset',
    password_change: '/password_change',
    session: '/session',
    user: '/user',
    authorize: '/authorize',
    access_token: '/access_token'
  }, config.routes);

  const oauth = OAuth(config);
  const router = Router();

  // Login
  router.get(R.login, user.login);
  router.post(R.session, csrf, user.session);

  // Reset password
  router.get(R.password_reset, user.passwordResetPage);
  router.post(R.password_reset, user.passwordReset);

  // Change password
  router.get(R.password_change, user.passwordChangePage);
  router.post(R.password_change, user.passwordChange);

  // API: get user info
  router.get(R.user, oauth.authenticate, user.getInfo);

  // OAuth
  router.get(R.authorize, user.checkLogin, oauth.authorize);
  router.post(R.access_token, oauth.accessToken);

  // Admin
  router.get(R.home, user.checkLogin, admin.userList);
  router.get(R.clients, user.checkLogin, admin.clientList);

  app.use(function * injectParams(next) {
    this.state._csrf = this.csrf;
    this._routes = this.state._routes = R;
    yield * next;
  });
  app.use(router.routes());
  app.use(router.allowedMethods());
}
