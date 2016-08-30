'use strict';

import nm from 'nodemailer';

export default function (app, options = {}) {
  const templates = options.templates || {};
  const transport = nm.createTransport(options);

  app.use(function * mailHandler (next) {
    this.sendMail = function * sendMail (to, template, context, attachments = null) {
      let tpl = templates[template];
      let sender = transport.templateSender(tpl, {
        from: options.from
      });

      yield sender({
        to: to,
        attachments: attachments
      }, context);
    };

    yield * next;
  });
}
