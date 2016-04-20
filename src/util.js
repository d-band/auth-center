'use strict';

import crypto from 'crypto';
import base32 from 'thirty-two';
import qr from 'qr-image';
import { parse, format } from 'url';

export function makeSalt() {
  return Math.round((new Date().valueOf() * Math.random())) + '';
}

export function encrypt(pass, salt) {
  if (!pass) return null;
  return crypto.createHmac('sha1', salt).update(pass).digest('hex');
}

export function checkURI(base, checked) {
  let url1 = parse(base, false, true);
  let url2 = parse(checked, false, true);

  url1.port = url1.port || 80;
  url2.port = url2.port || 80;
  url1.pathname = url1.pathname || '/';
  url2.pathname = url2.pathname || '/';

  return url1.hostname === url2.hostname &&
    url1.port === url2.port &&
    url2.pathname.indexOf(url1.pathname) === 0;
}

export function generateToken() {
  let buffer = crypto.randomBytes(256);
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

export function buildURI(uri, query) {
  let obj = parse(uri, true);
  Object.assign(obj.query, query);
  delete obj.search;
  return format(obj);
}

export function totpURI(user, key) {
  let encoded = base32.encode(key).toString().replace(/=/g, '');
  return `otpauth://totp/${user}?secret=${encoded}`;
}

export function totpImage(user, key) {
  return qr.imageSync(totpURI(user, key), 'H');
}
