'use strict';

import Router from 'koa-router';
import OAuth from './oauth';
import * as user from './controllers/user';

function * csrf(next) {
  this.assertCSRF(this.request.body);
  yield next;
}

export default function routes(app, config) {
  const oauth = OAuth(config);
  const router = Router();

  // User
  router.get('/login', user.login);
  router.post('/session', csrf, user.session);
  router.get('/user', oauth.authenticate, user.getInfo);

  // OAuth
  router.get('/authorize', user.checkLogin, oauth.authorize);
  router.post('/access_token', oauth.accessToken);

  app.use(router.routes());
  app.use(router.allowedMethods());
}
