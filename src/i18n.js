'use strict';

import { existsSync } from 'fs';
import { join } from 'path';

export default function i18n (messages) {
  const dir = join(__dirname, '../i18n');
  const _userMessages = messages || {};
  const _messages = {};
  return (ctx, next) => {
    if (ctx.query.locale) {
      ctx.session.locale = ctx.query.locale;
    }
    ctx.state.__ = (key) => {
      const lang = ctx.session.locale || 'en';
      if (!_messages[lang]) {
        const temp = _userMessages[lang] || _userMessages['*'] || {};
        const file = join(dir, `${lang}.json`);
        if (existsSync(file)) {
          _messages[lang] = Object.assign(require(file), temp);
        } else {
          _messages[lang] = Object.assign({}, temp);
        }
      }
      return _messages[lang][key] || key;
    };
    return next();
  };
}
