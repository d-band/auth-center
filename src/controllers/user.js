'use strict';

import isEmail from 'validator/lib/isEmail';

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
    this.flash('success', 'Check your email for a link to reset your password.')
    this.redirect(this._routes.login);
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Send email failed');
    this.redirect(this._routes.password_reset);
  }
}

export function * passwordChangePage() {
  yield this.render('change');
}

export function * passwordChange() {
  yield this.render('change');
}

export function * getInfo(next) {
  this.body = 'hello world';
  yield next;
}
