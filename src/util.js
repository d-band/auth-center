'use strict';

import crypto from 'crypto';

export function makeSalt() {
  return Math.round((new Date().valueOf() * Math.random())) + '';
}

export function encrypt(pass, salt) {
  if (!pass) return null;
  return crypto.createHmac('sha1', salt).update(pass).digest('hex');
}
