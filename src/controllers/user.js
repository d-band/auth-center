'use strict';

export function * checkLogin(next) {
  if (this.session.user) {
    yield next;
  } else {
    this.session.returnTo = this.url;
    this.redirect(this.state._routes.login);
  }
}

export function * login() {
  yield this.render('login');
}

export function * passwordReset() {
  yield this.render('reset');
}

export function * passwordChange() {
  yield this.render('change');
}

export function * session() {
  const User = this.orm().User;

  let {username, password} = this.request.body;

  if (!username) {
    this.flash('error', 'Username is required');
    this.redirect(this.state._routes.login);
    return;
  }
  if (!password) {
    this.flash('error', 'Password is required');
    this.redirect(this.state._routes.login);
    return;
  }

  let user = yield User.auth(username, password);

  if (!user) {
    this.flash('error', 'Username or password is invalid');
    this.redirect(this.state._routes.login);
    return;
  }

  let returnTo = this.session.returnTo;

  this.session.returnTo = null;
  this.redirect(returnTo || this.state._routes.home);
}

export function * getInfo(next) {
  this.body = 'hello world';
  yield next;
}
