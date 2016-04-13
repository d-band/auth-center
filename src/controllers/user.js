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
