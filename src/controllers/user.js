'use strict';

import { buildURI } from '../util';

export function * checkLogin(next) {
  if (this.session.user) {
    yield next;
  } else {
    this.redirect(buildURI('/login', {
      return_to: this.url
    }));
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

export function * session(next) {
  yield next;
}

export function * getInfo(next) {
  this.body = 'hello world';
  yield next;
}
