'use strict';

import nm from 'nodemailer';

export default function(app, options) {
  let _options = options || {};
  let templates = _options.templates || {};
  let transport = nm.createTransport(_options);

  app.use(function * mailHandler(next) {
    if (this.sendMail) return yield * next;

    this.sendMail = function * sendMail(to, template, context) {
      let tpl = templates[template];
      let sender = transport.templateSender(tpl, {
        from: _options.from
      });

      yield sender({
        to: to
      }, context);
    };

    yield * next;
  });
}
