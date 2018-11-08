'use strict';

import Koa from 'koa';
import view from 'koa-view';
import bodyParser from 'koa-bodyparser';
import session from 'koa-session';
import logger from 'koa-logger';
import serve from 'koa-static';
import orm from 'koa-orm';

import I18n from './i18n';
import Config from './config';
import routes from './routes';
import error from './middlewares/error';
import flash from './middlewares/flash';
import mail from './middlewares/mail';
import { pagination } from './util';

export default function (options) {
  const config = Config(options);
  const app = new Koa();

  app.use(async function injectConfig (ctx, next) {
    ctx.__defineGetter__('config', () => {
      return Config();
    });
    ctx.__defineGetter__('_routes', () => {
      return Config().routes;
    });
    ctx.state.__defineGetter__('logo', () => {
      return Config().logo;
    });
    ctx.state.__defineGetter__('favicon', () => {
      return Config().favicon;
    });
    ctx.state.__defineGetter__('_routes', () => {
      return Config().routes;
    });
    await next();
  });

  app.use(bodyParser());
  app.use(logger());

  /** Set public path, for css/js/images **/
  app.use(serve(config.staticPath, {
    maxage: config.debug ? 0 : 60 * 60 * 24 * 7
  }));

  /** Sessions **/
  app.keys = config.keys;
  app.use(session(config.session, app));

  /** I18n **/
  const i18n = new I18n(config.messages);

  app.use(async function injectI18n (ctx, next) {
    if (ctx.query.locale) {
      ctx.session.locale = ctx.query.locale;
    }
    i18n.setLocale(ctx.session.locale);
    await next();
  });

  /** View & i18n **/
  app.use(view(config.viewPath, {
    noCache: config.debug,
    globals: {
      pagination,
      __: function (key) {
        return i18n.message(key);
      }
    }
  }));

  /** ORM **/
  app.orm = orm(config.orm);
  app.use(app.orm.middleware);

  /** Middlewares **/
  error(app);
  flash(app);
  mail(app, config.mail);

  /** Router **/
  routes(app, config);

  return app;
}
