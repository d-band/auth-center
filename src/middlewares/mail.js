'use strict';

import nm from 'nodemailer';

const TPL = {
  password_reset: {
    subject: 'Please reset your password',
    html: '<p>Hello, <strong>{{username}}</strong>, we heard that you lost your GitHub password. Sorry about that!</p>' +
      '<p>But don’t worry! You can use the following link to reset your password:</p>' +
      '<p><a href="{{link}}">{{link}}</a></p>' +
      '<p>If you don’t use this link within {{ttl}} hours, it will expire.</p>' +
      '<p>Thanks!</p>'
  }
};

export default function(app, config) {
  let mail = config.mail || {};
  let templates = mail.templates || {};
  let transport = nm.createTransport(mail);

  app.use(function * mailHandler(next) {
    if (this.sendMail) return yield * next;

    this.sendMail = function* (to, template, context) {
      let tpl = Object.assign({}, templates[template], TPL[template]);
      let sender = transport.templateSender(tpl, {
        from: mail.from
      });

      yield sender({
        to: to
      }, context);
    };

    yield * next;
  });
}
