'use strict';

import { buildURI } from '../util';

export default function(app) {
  app.use(function * (next) {
    try {
      yield next;
      if (404 === this.response.status && !this.response.body) this.throw(404);
    } catch (err) {
      console.error(err.stack || err);

      let status = err.status || 500;
      let message = err.status ? err.message : 'Internal server error';

      this.app.emit('error', err, this);

      if (err.returnTo) {
        this.redirect(buildURI(err.returnTo, {
          error: message
        }));
        return;
      }

      switch (this.accepts('html', 'text', 'json')) {
        case 'text':
          this.type = 'text/plain';
          this.body = message;
          break;
        case 'html':
          yield this.render('error', {
            status: status,
            message: message
          });
          break;
        default:
          this.type = 'application/json';
          this.body = {
            code: status,
            message: message
          };
      }
    }
  });
}
