'use strict';

import nm from 'nodemailer';
import template from 'lodash.template';

export default function (app, options = {}) {
  const templates = options.templates || {};
  const transport = nm.createTransport(options);
  Object.keys(templates).forEach(k => {
    templates[k].title = template(templates[k].subject, {
      interpolate: /{{([\s\S]+?)}}/g
    });
    templates[k].render = template(templates[k].html, {
      interpolate: /{{([\s\S]+?)}}/g
    });
  });
  app.use(async function mailHandler (ctx, next) {
    ctx.sendMail = (to, key, data, files) => new Promise((resolve, reject) => {
      const tpl = templates[key];
      transport.sendMail({
        from: options.from,
        to: to,
        attachments: files,
        subject: tpl.title(data),
        html: tpl.render(data)
      }, (err) => {
        if (err) {
          console.error(err);
          reject(new Error('Send failed'));
        } else {
          resolve();
        }
      });
    });

    await next();
  });
}
