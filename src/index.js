'use strict';

import koa from 'koa';
import view from 'koa-view';
import bodyParser from 'koa-bodyparser';
import session from 'koa-generic-session';
import logger from 'koa-logger';
import statik from 'koa-static';
import csrf from 'koa-csrf';
import orm from 'koa-orm';

import routes from './routes';
import error from './middlewares/error';
import flash from './middlewares/flash';
import mail from './middlewares/mail';
import I18n from './i18n';

export default function(config) {
  const app = koa();

  app.use(function * injectConfig(next) {
    this.config = config;
    yield * next;
  });

  app.use(bodyParser());
  app.use(logger());

  /** Set public path, for css/js/images **/
  app.use(statik(config.staticPath, {
    maxage: config.debug ? 0 : 60 * 60 * 24 * 7
  }));

  /** Sessions **/
  app.keys = config.keys || ['auth', 'center'];
  app.use(session({
    key: 'sid'
  }, app));

  const i18n = new I18n(config.messages);

  app.use(function * injectI18n(next) {
    if (this.query.locale) {
      this.session.locale = this.query.locale;
    }
    i18n.setLocale(this.session.locale);
    yield * next;
  });

  /** View & i18n **/
  app.use(view(config.viewPath, {
    noCache: config.debug,
    globals: {
      __: function(key) {
        return i18n.message(key);
      }
    }
  }));

  /** ORM **/
  app.orm = orm(config.orm);
  app.use(app.orm.middleware);

  /** CSRF */
  csrf(app);

  /** Middlewares **/
  error(app);
  flash(app);
  mail(app, config);

  /** Router **/
  routes(app, config);

  return app;
}
