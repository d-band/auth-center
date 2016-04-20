'use strict';

export function * userList() {
  let offset = this.query.offset || 0;
  const User = this.orm().User;
  let users = yield User.findAndCountAll({
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
  const Client = this.orm().Client;
  let clients = yield Client.findAndCountAll({
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
    const User = this.orm().User;
    let res = yield User.update({
      totp_key: util.generateToken()
    }, {
      where: {
        username: cond.username
      }
    });
    // send email
    if (res[0]) {
      let user = yield User.findOne({
        where: {
          username: cond.username
        }
      });
      yield this.sendMail(user.email, 'send_totp', {
        username: user.username,
        cid: 'key'
      }, [{
        filename: 'key.png',
        content: util.totpImage(user.username, user.key),
        cid: 'key'
      }]);
    } else {
      this.flash('error', 'Update failed');
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

export function * addClient() {
  const cond = this.request.body;
  if (!cond.name) {
    this.flash('error', 'Name is required');
    this.redirect(this._routes.clients);
    return;
  }
  if (!cond.redirect_uri) {
    this.flash('error', 'Redirect URI is required');
    this.redirect(this._routes.clients);
    return;
  }
  try {
    // add one new
    const util = require('../util');
    const Client = this.orm().Client;
    let res = yield Client.create({
      secret: util.generateToken(),
      name: cond.name,
      redirect_uri: cond.redirect_uri
    });
    if (res.id) {
      this.flash('success', 'Add new client successfully');
      this.redirect(this._routes.clients);
    } else {
      this.flash('error', 'Create failed');
      this.redirect(this._routes.clients);
      return;
    }
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Add new client failed');
    this.redirect(this._routes.clients);
  }
}

export function * generateSecret() {
  let cond = this.request.body;
  if (!cond.id) {
    this.flash('error', 'ID is required');
    this.redirect(this._routes.clients);
    return;
  }
  try {
    // generate new secret
    const util = require('../util');
    const Client = this.orm().Client;
    let res = yield Client.update({
      secret: util.generateToken()
    }, {
      where: {
        id: cond.id
      }
    });
    if (res[0]) {
      this.flash('success', 'Generate new secret successfully');
      this.redirect(this._routes.clients);
    } else {
      this.flash('error', 'Update failed');
      this.redirect(this._routes.clients);
      return;
    }
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Generate new secret failed');
    this.redirect(this._routes.clients);
  }
}
