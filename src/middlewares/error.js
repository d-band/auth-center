'use strict';

import { buildURI } from '../util';

export default function (app) {
  app.use(async function errorHandler (ctx, next) {
    try {
      await next();
      if (ctx.response.status === 404 && !ctx.response.body) ctx.throw(404);
    } catch (err) {
      console.error(err.stack || err);

      const status = err.status || 500;
      const message = err.status ? err.message : 'Internal server error';

      ctx.app.emit('error', err, ctx);

      if (err.returnTo) {
        ctx.redirect(buildURI(err.returnTo, {
          error: message
        }));
        return;
      }

      ctx.status = status;
      switch (ctx.accepts('html', 'text', 'json')) {
        case 'text':
          ctx.type = 'text/plain';
          ctx.body = message;
          break;
        case 'html':
          ctx.type = 'text/html';
          await ctx.render('error', {
            status: status,
            message: message
          });
          break;
        default:
          ctx.type = 'application/json';
          ctx.body = {
            error: message
          };
      }
    }
  });
}
