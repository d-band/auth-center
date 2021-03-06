'use strict';

const App = require('../app');
const co = require('co');

const app = App({
  debug: true,
  isTOTP: true,
  mail: {
    from: 'admin@example.com',
    name: 'minimal',
    version: '0.1.0',
    send: function(mail, callback) {
      const input = mail.message.createReadStream();
      const chunks = [];
      input.on('data', function(chunk) {
        chunks.push(chunk);
      });
      input.on('end', function() {
        const data = Buffer.concat(chunks).toString();
        console.log(data);
        callback(null, true);
      });
    }
  }
});

/** Start **/
if (!module.parent) {
  const port = 8888;
  app.listen(port);
  co(function*() {
    const { sync, User, Client, DicRole } = app.orm.database();
    yield sync({
      force: true
    });
    yield User.add({
      id: 10001,
      password: 'nick',
      email: 'nick@example.com',
      totp_key: '1234',
      is_admin: true
    });
    yield User.add({
      id: 10002,
      password: 'ken',
      email: 'ken@example.com',
      totp_key: '1234',
      is_admin: true
    });
    yield Client.create({
      id: '740a1d6d-9df8-4552-a97a-5704681b8039',
      name: 'local',
      secret: '12345678',
      redirect_uri: 'http://localhost:8080'
    });
    yield Client.create({
      id: 'bd0e56c1-8f02-49f3-b502-129da70b6f09',
      name: 'test',
      secret: '12345678',
      redirect_uri: 'http://localhost:9090'
    });
    yield DicRole.create({
      name: 'user',
      description: 'Normal user'
    });
    yield DicRole.create({
      name: 'document',
      description: 'Document department'
    });
  }).then(() => {
    console.log(`Running site at: http://127.0.0.1:${port}`);
  });
}
