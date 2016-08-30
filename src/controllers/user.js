'use strict';

import isEmail from 'validator/lib/isEmail';
import { totp } from 'notp';

export function * home () {
  if (this.config.redirectURL) {
    this.redirect(this.config.redirectURL);
  } else {
    yield this.render('home', {
      user: this.session.user
    });
  }
}

export function * checkLogin (next) {
  if (this.session.user) {
    yield next;
  } else {
    this.session.returnTo = this.url;
    this.redirect(this._routes.login);
  }
}

export function * login () {
  yield this.render('login', {
    isTOTP: this.config.isTOTP
  });
}

export function * session () {
  const { User } = this.orm();
  const { username, password, token } = this.request.body;

  if (!username) {
    this.flash('error', 'Username is required');
    this.redirect(this._routes.login);
    return;
  }
  if (!password) {
    this.flash('error', 'Password is required');
    this.redirect(this._routes.login);
    return;
  }
  if (this.config.isTOTP && !token) {
    this.flash('error', 'Token is required');
    this.redirect(this._routes.login);
    return;
  }

  const user = yield User.auth(username, password);

  if (!user) {
    this.flash('error', 'Username or password is invalid');
    this.redirect(this._routes.login);
    return;
  }

  if (this.config.isTOTP && !totp.verify(token, user.totp_key)) {
    this.flash('error', 'Token is invalid');
    this.redirect(this._routes.login);
    return;
  }

  const returnTo = this.session.returnTo;

  this.session.returnTo = null;
  this.session.user = user;
  this.redirect(returnTo || this._routes.home);
}

export function * logout (next) {
  const returnTo = this.query.return_to;
  this.session.user = null;
  this.redirect(returnTo || this._routes.login);
  yield next;
}

export function * passwordResetPage () {
  yield this.render('reset');
}

export function * passwordReset () {
  const { User, EmailCode } = this.orm();
  const { email } = this.request.body;

  if (!email || !isEmail(email)) {
    this.flash('error', 'Email is empty or invalid type');
    this.redirect(this._routes.password_reset);
    return;
  }

  const user = yield User.findByEmail(email);
  if (!user) {
    this.flash('error', 'User not found');
    this.redirect(this._routes.password_reset);
    return;
  }

  try {
    const code = yield EmailCode.create({
      user_id: user.username
    });
    yield this.sendMail(user.email, 'password_reset', {
      username: user.username,
      ttl: this.config.emailCodeTTL / 3600,
      link: this.config.domain + this._routes.password_change + '?code=' + code.id
    });
    this.flash('success', 'Check your email for a link to reset your password.');
    this.redirect(this._routes.login);
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Send email failed');
    this.redirect(this._routes.password_reset);
  }
}

export function * passwordChangePage () {
  const { EmailCode } = this.orm();

  let codeId = this.query.code;

  if (!codeId) {
    this.flash('error', 'Code is required');
    this.redirect(this._routes.password_reset);
    return;
  }

  let code = yield EmailCode.findById(codeId);
  if (!code) {
    this.flash('error', 'Code is invalid');
    this.redirect(this._routes.password_reset);
    return;
  }

  let expiresAt = code.createdAt.getTime() + this.config.emailCodeTTL * 1000;
  if (expiresAt < Date.now()) {
    this.flash('error', 'Code is expired');
    this.redirect(this._routes.password_reset);
    return;
  }
  yield this.render('change', {
    codeId: codeId,
    title: 'Change password'
  });
}

export function * passwordChange () {
  const { User, EmailCode } = this.orm();
  const { password, password2, codeId } = this.request.body;

  if (!codeId) {
    this.flash('error', 'Code is required');
    this.redirect(this._routes.password_reset);
    return;
  }

  const code = yield EmailCode.findById(codeId);
  if (!code) {
    this.flash('error', 'Code is invalid');
    this.redirect(this._routes.password_reset);
    return;
  }

  const expiresAt = code.createdAt.getTime() + this.config.emailCodeTTL * 1000;
  if (expiresAt < Date.now()) {
    this.flash('error', 'Code is expired');
    this.redirect(this._routes.password_reset);
    return;
  }

  if (!password || !password2 || password !== password2 || password.length < 8) {
    this.flash('error', 'Password is invalid');
    this.redirect('back');
    return;
  }

  // TODO: add transaction
  yield User.changePassword(code.user_id, password);
  yield EmailCode.destroy({
    where: {
      id: codeId
    }
  });

  this.flash('success', 'Password have changed');
  this.redirect(this._routes.login);
}

export function * getInfo (next) {
  const { User } = this.orm();

  this.body = yield User.findById(this._userId, {
    attributes: ['username', 'email'],
    raw: true
  });
}
