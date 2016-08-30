'use strict';

export default function (app) {
  let key = 'messages';

  app.use(function * flashHandler (next) {
    let ctx = this;
    this.state[key] = ctx.session[key] || {};

    delete ctx.session[key];

    ctx.flash = function (type, msg) {
      ctx.session[key] = ctx.session[key] || {};
      ctx.session[key][type] = msg;
    };

    yield * next;

    if (this.status === 302 && this.session && !(this.session[key])) {
      this.session[key] = this.state[key];
    }
  });
}
