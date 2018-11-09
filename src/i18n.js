'use strict';

import { existsSync } from 'fs';
import { join } from 'path';

export default class I18n {
  constructor (messages) {
    this._path = join(__dirname, '../i18n');
    this._userMessages = messages || {};
    this.setLocale('en');
  }

  setLocale (locale) {
    if (!locale || this._locale === locale) return;

    const temp = this._userMessages[locale] || this._userMessages['*'] || {};
    const file = join(this._path, locale + '.json');

    if (existsSync(file)) {
      this._locale = locale;
      this._messages = Object.assign(require(file), temp);
    } else {
      this._locale = 'en';
      this._messages = Object.assign({}, temp);
    }
  }

  message (key) {
    return this._messages[key] || key;
  }
}
