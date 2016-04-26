'use strict';

const join = require('path').join;
const App = require('../app');
const co = require('co');

const app = App({
  debug: true,
  isTOTP: false,
  mail: {
        from: 'admin@example.com',
        name: 'minimal',
        version: '0.1.0',
        send: function(mail, callback) {
          let input = mail.message.createReadStream();
          let chunks = [];
          input.on('data', function(chunk) {
            chunks.push(chunk);
          });
          input.on('end', function() {
            let data = Buffer.concat(chunks).toString();
            callback(null, true);
          });
        }
  }
});

/** Start **/
if (!module.parent) {
  app.listen(8888);
  co(function*() {
    const orm = app.orm.database();
    yield orm.sequelize.sync({
      force: true
    });
    yield orm.User.add({
      username: 'test',
      password: 'test',
      email: 'test@example.com',
      totp_key: '1234'
    });
    yield orm.Client.create({
      id: '12345678',
      name: 'test',
      secret: '12345678',
      redirect_uri: 'http://localhost:8080'
    });
    yield orm.Client.create({
      id: '12345678',
      name: 'test',
      secret: '12345678',
      redirect_uri: 'http://121.199.13.86:8080'
    });
  }).then(function() {});
  console.log(`Running site at: http://127.0.0.1:8888`);
}
