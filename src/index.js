'use strict';

import Koa from 'koa';
import view from 'koa-view';
import bodyParser from 'koa-bodyparser';
import session from 'koa-session';
import logger from 'koa-logger';
import serve from 'koa-static';
import orm from 'koa-orm';

import I18n from './i18n';
import config from './config';
import routes from './routes';
import error from './middlewares/error';
import flash from './middlewares/flash';
import mail from './middlewares/mail';
import { pagination, isURL } from './util';

export default function (options) {
  const cfg = config(options);
  const app = new Koa();

  const { staticPath } = cfg;
  app.use(async function injectConfig (ctx, next) {
    ctx.__defineGetter__('config', config);
    ctx._routes = cfg.routes;
    ctx.state._routes = cfg.routes;
    ctx.state.logo = cfg.logo;
    ctx.state.favicon = cfg.favicon;
    ctx.state.staticRoot = isURL(staticPath) ? staticPath : '';
    await next();
  });

  /** Set public path, for css/js/images **/
  if (!isURL(staticPath)) {
    app.use(serve(cfg.staticPath, {
      maxage: cfg.debug ? 0 : 60 * 60 * 24 * 7
    }));
  }

  app.use(bodyParser());
  app.use(logger());

  /** Sessions **/
  app.keys = cfg.keys;
  app.use(session(cfg.session, app));

  /** I18n **/
  const i18n = new I18n(cfg.messages);

  app.use(async function injectI18n (ctx, next) {
    if (ctx.query.locale) {
      ctx.session.locale = ctx.query.locale;
    }
    i18n.setLocale(ctx.session.locale);
    await next();
  });

  /** View & i18n **/
  app.use(view(cfg.viewPath, {
    noCache: cfg.debug,
    globals: {
      pagination,
      __: function (key) {
        return i18n.message(key);
      }
    }
  }));

  /** ORM **/
  app.orm = orm(cfg.orm);
  app.use(app.orm.middleware);

  /** Middlewares **/
  error(app);
  flash(app);
  mail(app, cfg.mail);

  /** Router **/
  routes(app, cfg);

  return app;
}
