'use strict';

export function * userList() {
  let offset = this.query.offset || 0;
  const USER = this.orm().User;
  let users = yield USER.findAndCountAll({
    attributes: ['username', 'totp_key'],
    where: {
      enable: 1
    },
    offset: offset * 20,
    limit: 20,
    order: [
      ['username', 'ASC']
    ]
  });
  yield this.render('admin/users', {
    users: 'active',
    data: users,
    offset: offset
  });
}

export function * clientList() {
  let offset = this.query.offset || 0;
  const CLIENT = this.orm().Client;
  let clients = yield CLIENT.findAndCountAll({
    attributes: ['id', 'secret', 'redirect_uri', 'name'],
    offset: offset * 20,
    limit: 20,
    order: [
      ['name', 'ASC']
    ]
  });
  yield this.render('admin/clients', {
    clients: 'active',
    data: clients,
    offset: offset
  });
}

export function * sendTotp() {
  const cond = this.request.body;
  if (!cond.username) {
    this.flash('error', 'Username is required');
    this.redirect(this._routes.users);
    return;
  }
  try {
    // generate new totp key
    const util = require('../util');
    let key = util.generateToken();
    const USER = this.orm().User;
    let res = yield USER.update({
      totp_key: key
    }, {
      where: {
        username: cond.username
      }
    });
    // send email
    if (res[0]) {
      let user = yield USER.findOne({
        where: {
          username: cond.username
        }
      });
      yield this.sendMail(user.email, 'send_totp', {
        username: user.username,
        cid: 'key'
      }, [{
        filename: 'key.png',
        content: util.totpImage(cond.username, key),
        cid: 'key'
      }]);
    } else {
      this.flash('error', 'Update key failed');
      this.redirect(this._routes.users);
      return;
    }
    this.flash('success', 'Reset and send TOTP key successfully');
    this.redirect(this._routes.users);
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Reset and send key failed');
    this.redirect(this._routes.users);
  }
}

export function * generateSecret() {
  // let cond = this.request.body;

}
