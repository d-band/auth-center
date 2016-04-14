'use strict';

import Router from 'koa-router';
import OAuth from './oauth';
import * as user from './controllers/user';

function * csrf(next) {
  this.assertCSRF(this.request.body);
  yield next;
}

export default function routes(app, config) {
  const R = Object.assign({
    home: '/',
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

  // User
  router.get(R.login, user.login);
  router.get(R.password_reset, user.passwordReset);
  router.get(R.password_change, user.passwordChange);
  router.post(R.session, csrf, user.session);
  router.get(R.user, oauth.authenticate, user.getInfo);

  // OAuth
  router.get(R.authorize, user.checkLogin, oauth.authorize);
  router.post(R.access_token, oauth.accessToken);

  app.use(function * injectParams(next) {
    this.state._csrf = this.csrf;
    this.state._routes = R;
    yield * next;
  });
  app.use(router.routes());
  app.use(router.allowedMethods());
}
