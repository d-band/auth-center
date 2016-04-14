'use strict';

import { existsSync } from 'fs';
import { join } from 'path';

export default class I18n {

  constructor(messages) {
    this._userMessages = messages || {};
    this.setLocale('en');
  }

  setLocale(locale) {
    if (!locale || this._locale === locale) return;

    let temp = this._userMessages[locale] || {};
    let file = join(__dirname, locale + '.js');

    if (existsSync(file)) {
      this._locale = locale;
      this._messages = Object.assign(require(file)(), temp);
    } else {
      this._locale = 'en';
      this._messages = Object.assign(require('./en')(), temp);
    }
  }

  message(key) {
    return this._messages[key] || '';
  }

}
