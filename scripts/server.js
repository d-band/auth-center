'use strict';

import Server from '../src';

const staticPath = 'http://localhost:7777';
const server = Server({
  debug: true,
  isTOTP: true,
  staticPath,
  logo: `${staticPath}/logo.png`,
  favicon: `${staticPath}/logo.png`,
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
  // init
  async function init() {
    const {
      sync, User, Client, DicRole
    } = server.orm.database();
    await sync({
      force: true
    });
    await User.add({
      id: 10001,
      password: 'nick',
      email: 'nick@example.com',
      totp_key: '1234',
      is_admin: true
    });
    await User.add({
      id: 10002,
      password: 'ken',
      email: 'ken@example.com',
      totp_key: '1234',
      is_admin: true
    });
    await Client.create({
      id: '740a1d6d-9df8-4552-a97a-5704681b8039',
      name: 'local',
      secret: '12345678',
      redirect_uri: 'http://localhost:8080'
    });
    await Client.create({
      id: 'bd0e56c1-8f02-49f3-b502-129da70b6f09',
      name: 'test',
      secret: '12345678',
      redirect_uri: 'http://localhost:9090'
    });
    await DicRole.create({
      name: 'user',
      description: 'Normal user'
    });
    await DicRole.create({
      name: 'document',
      description: 'Document department'
    });
  }

  init().then(() => {
    server.listen(port);
    console.log('\nInit database done.');
    console.log(`\nRunning site at:\x1B[36m http://127.0.0.1:${port}\x1B[39m`);
  });
}
