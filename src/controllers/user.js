'use strict';

export function * getInfo(next) {
  this.body = 'hello world';
  yield next;
}
