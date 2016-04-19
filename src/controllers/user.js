'use strict';

import isEmail from 'validator/lib/isEmail';

export function * home() {
  yield this.render('home', {
    user: this.session.user
  });
}

export function * checkLogin(next) {
  if (this.session.user) {
    yield next;
  } else {
    this.session.returnTo = this.url;
    this.redirect(this._routes.login);
  }
}

export function * login() {
  yield this.render('login');
}

export function * session() {
  const User = this.orm().User;

  let {username, password} = this.request.body;

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

  let user = yield User.auth(username, password);

  if (!user) {
    this.flash('error', 'Username or password is invalid');
    this.redirect(this._routes.login);
    return;
  }

  let returnTo = this.session.returnTo;

  this.session.returnTo = null;
  this.session.user = user;
  this.redirect(returnTo || this._routes.home);
}

export function * logout(next) {
  this.session.user = null;
  this.redirect(this._routes.login);
  yield next;
}

export function * passwordResetPage() {
  yield this.render('reset');
}

export function * passwordReset() {
  const User = this.orm().User;
  const EmailCode = this.orm().EmailCode;

  let email = this.request.body.email;
  if (!email && isEmail(email)) {
    this.flash('error', 'Email is empty or invalid type');
    this.redirect(this._routes.password_reset);
  }

  let user = yield User.findByEmail(email);
  if (!user) {
    this.flash('error', 'User not found');
    this.redirect(this._routes.password_reset);
  }

  try {
    let code = yield EmailCode.create({
      user_id: user.username
    });
    yield this.sendMail(user.email, 'password_reset', {
      username: user.username,
      ttl: this._config.emailCodeTTL / 3600,
      link: `${this._config.domain}${this._routes.password_change}?code=${code}`
    });
    this.flash('success', 'Check your email for a link to reset your password.');
    this.redirect(this._routes.login);
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Send email failed');
    this.redirect(this._routes.password_reset);
  }
}

export function * passwordChangePage() {
  const EmailCode = this.orm().EmailCode;

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

  let expiresAt = code.createdAt.getTime() + this._config.emailCodeTTL * 1000;
  if (expiresAt < Date.now()) {
    this.flash('error', 'Code is expired');
    this.redirect(this._routes.password_reset);
    return;
  }
  yield this.render('change');
}

export function * passwordChange() {
  const User = this.orm().User;
  const EmailCode = this.orm().EmailCode;

  let {password, password2, codeId} = this.request.body;

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

  let expiresAt = code.createdAt.getTime() + this._config.emailCodeTTL * 1000;
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

export function * getInfo(next) {
  const User = this.orm().User;

  this.body = yield User.findById(this._userId, {
    attributes: ['username', 'email'],
    raw: true
  });
}
