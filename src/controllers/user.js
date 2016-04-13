'use strict';

export function * checkLogin(next) {
  if (this.session.user) {
    yield next;
  } else {
    this.redirect(`/login?return_to=${encodeURIComponent(this.url)}`);
  }
}

export function * login(next) {
  this.body = 'hello:' + this.query.return_to;
  yield next;
}

export function * session(next) {
  yield next;
}

export function * getInfo(next) {
  this.body = 'hello world';
  yield next;
}
