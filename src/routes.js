'use strict';

import Router from 'koa-router';
import * as user from './controllers/user';

export default function routes(app) {
  const router = Router();
  // User
  router.get('/user', user.getInfo);

  app.use(router.routes());
  app.use(router.allowedMethods());
}
