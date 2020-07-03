'use strict';

import Router from 'koa-router';
import CSRF from 'koa-csrf';
import OAuth from './oauth';
import * as user from './controllers/user';
import * as admin from './controllers/admin';
import * as scan from './controllers/scan';

export default function routes (app, config) {
  const R = config.routes;
  const oauth = OAuth(config);
  const authRouter = new Router();
  // API: get user info
  authRouter.get(R.user, oauth.authenticate, user.getInfo);
  // OAuth
  authRouter.get(R.authorize, user.checkLogin, oauth.authorize);
  authRouter.post(R.access_token, oauth.accessToken);
  authRouter.post(R.scan_login, oauth.authenticate, scan.login);

  const router = new Router();
  router.get(R.home, user.checkLogin, user.home);
  router.get(R.security, user.checkLogin, user.security);
  router.post(R.security_change, user.checkLogin, user.securityChange);
  // Login & Logout
  router.get(R.login, user.login);
  router.get(R.logout, user.logout);
  router.post(R.login_token, user.checkToken('LOGIN_TOKEN'), user.loginToken);
  router.post(R.session, user.session);
  // Scan Login
  router.post(R.qrcode, scan.qrcode);
  // Reset password
  router.get(R.password_reset, user.passwordResetPage);
  router.post(R.resetpwd_token, user.checkToken('RESETPWD_TOKEN'), user.resetpwdToken);
  // Change password
  router.get(R.password_change, user.checkResetToken, user.passwordChangePage);
  router.post(R.password_change, user.checkResetToken, user.passwordChange);
  // Admin
  router.get(R.admin.users, admin.checkLogin, admin.userList);
  router.post(R.admin.search_user, admin.checkLogin, admin.searchUser);
  router.get(R.admin.clients, admin.checkLogin, admin.clientList);
  router.post(R.admin.send_totp, admin.checkLogin, admin.sendTotp);
  router.post(R.admin.add_client, admin.checkLogin, admin.addClient);
  router.post(R.admin.generate_secret, admin.checkLogin, admin.generateSecret);
  router.get(R.admin.roles, admin.checkLogin, admin.roleList);
  router.post(R.admin.add_role, admin.checkLogin, admin.addRole);
  router.post(R.admin.delete_role, admin.checkLogin, admin.deleteRole);

  app.use(authRouter.routes());
  app.use(authRouter.allowedMethods());
  app.use(new CSRF());
  app.use(async (ctx, next) => {
    ctx.state._csrf = ctx.csrf;
    ctx.cookies.set('XSRF-TOKEN', ctx.csrf, {
      httpOnly: false
    });
    await next();
  });
  app.use(router.routes());
  app.use(router.allowedMethods());
}
