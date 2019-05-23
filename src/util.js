'use strict';

import crypto from 'crypto';
import base32 from 'thirty-two';
import qr from 'qr-image';
import nanoid from 'nanoid';
import { parse, format } from 'url';

export function isURL (str) {
  return /^(https?:|)(\/\/)/i.test(str);
}

export function pagination (cur, total, link, half = 2) {
  if (total <= 1) return '';

  let left = Math.max(1, cur - half);
  const right = Math.min(left + half * 2, total);

  if (total - cur <= half) {
    left = Math.max(1, total - half * 2);
  }
  const temp = ['<ul class="pagination">'];
  if (cur > 1) {
    temp.push(`<li><a href="${link(cur - 1)}">&laquo;</a></li>`);
  }

  for (let i = left; i <= right; i++) {
    temp.push(`<li class="${cur === i ? 'active' : ''}"><a href="${link(i)}">${i}</a></li>`);
  }
  if (cur !== total) {
    temp.push(`<li><a href="${link(cur + 1)}">&raquo;</a></li>`);
  }
  temp.push('</ul>');
  return temp.join('');
}

export function makeSalt () {
  return Math.round(Date.now() * Math.random()).toString();
}

export function encrypt (pass, salt) {
  if (!pass) return null;
  return crypto.createHmac('sha1', salt).update(pass).digest('hex');
}

export function checkURI (base, checked) {
  const url1 = parse(base, false, true);
  const url2 = parse(checked, false, true);

  url1.port = url1.port || 80;
  url2.port = url2.port || 80;
  url1.pathname = url1.pathname || '/';
  url2.pathname = url2.pathname || '/';

  return url1.hostname === url2.hostname &&
    url1.port === url2.port &&
    url2.pathname.indexOf(url1.pathname) === 0;
}

export function generateId () {
  return nanoid(40);
}

export function buildURI (uri, query) {
  const obj = parse(uri, true);
  Object.assign(obj.query, query);
  delete obj.search;
  return format(obj);
}

export function encodeKey (key) {
  return base32.encode(key).toString().replace(/=/g, '');
}

export function totpURI (user, key) {
  return `otpauth://totp/${user}?secret=${encodeKey(key)}`;
}

export function totpImage (user, key) {
  return qr.imageSync(totpURI(user, key), 'H');
}
