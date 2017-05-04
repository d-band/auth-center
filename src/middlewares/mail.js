'use strict';

import nm from 'nodemailer';
import template from 'lodash.template';

export default function (app, options = {}) {
  const templates = options.templates || {};
  const transport = nm.createTransport(options);
  Object.keys(templates).forEach(k => {
    templates[k].render = template(templates[k].html, {
      interpolate: /{{([\s\S]+?)}}/g
    });
  });
  app.use(function * mailHandler (next) {
    this.sendMail = function sendMail (to, tplName, context, attachments = null) {
      const tpl = templates[tplName];
      return transport.sendMail({
        from: options.from,
        to: to,
        attachments: attachments,
        subject: tpl.subject,
        html: tpl.render(context)
      });
    };

    yield * next;
  });
}
