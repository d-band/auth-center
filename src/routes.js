'use strict';

import Router from 'koa-router';
import * as user from './controllers/user';
import * as oauth from './oauth';

export default function routes(app) {
  const router = Router();

  // User
  router.get('/login', user.login);
  router.post('/session', user.session);
  router.get('/user', user.getInfo);

  // OAuth
  router.get('/authorize', oauth.authorize);
  router.post('/access_token', oauth.accessToken);

  app.use(router.routes());
  app.use(router.allowedMethods());
}
