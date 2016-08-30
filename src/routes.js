'use strict';

import Router from 'koa-router';
import OAuth from './oauth';
import * as user from './controllers/user';
import * as admin from './controllers/admin';

function * csrf (next) {
  this.assertCSRF(this.request.body);
  yield next;
}

export default function routes (app, config) {
  const R = config.routes;
  const oauth = OAuth(config);
  const router = Router();

  router.get(R.home, user.checkLogin, user.home);

  // Login & Logout
  router.get(R.login, user.login);
  router.get(R.logout, user.logout);
  router.post(R.session, csrf, user.session);

  // Reset password
  router.get(R.password_reset, user.passwordResetPage);
  router.post(R.password_reset, csrf, user.passwordReset);

  // Change password
  router.get(R.password_change, user.passwordChangePage);
  router.post(R.password_change, csrf, user.passwordChange);

  // API: get user info
  router.get(R.user, oauth.authenticate, user.getInfo);

  // OAuth
  router.get(R.authorize, user.checkLogin, oauth.authorize);
  router.post(R.access_token, oauth.accessToken);

  // Admin
  router.get(R.users, admin.checkLogin, admin.userList);
  router.post(R.search_user, admin.checkLogin, admin.searchUser);
  router.get(R.clients, admin.checkLogin, admin.clientList);
  router.post(R.send_totp, csrf, admin.checkLogin, admin.sendTotp);
  router.post(R.add_client, csrf, admin.checkLogin, admin.addClient);
  router.post(R.generate_secret, csrf, admin.checkLogin, admin.generateSecret);
  router.post(R.add_user, csrf, admin.checkLogin, admin.addUser);
  router.get(R.roles, admin.checkLogin, admin.roleList);
  router.post(R.add_role, csrf, admin.checkLogin, admin.addRole);
  router.post(R.delete_role, csrf, admin.checkLogin, admin.deleteRole);

  app.use(function * injectParams (next) {
    this.state._csrf = this.csrf;
    this.state.logo = config.logo;
    this._routes = this.state._routes = R;
    yield * next;
  });
  app.use(router.routes());
  app.use(router.allowedMethods());
}
