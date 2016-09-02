'use strict';

import { generateToken, encodeKey, totpImage } from '../util';
import rs from 'randomstring';

export function* checkLogin (next) {
  if (this.session.user) {
    if (this.session.user.is_admin) {
      this.state.user = this.session.user;
      yield * next;
    } else {
      this.redirect(this._routes.home);
    }
  } else {
    this.session.returnTo = this.url;
    this.redirect(this._routes.login);
  }
}

export function* searchUser () {
  const User = this.orm().User;
  const q = this.request.body.q || '';
  const users = yield User.findAll({
    attributes: ['username'],
    where: {
      enable: 1,
      username: {
        $like: q + '%'
      }
    },
    offset: 0,
    limit: 15
  });
  this.body = users.map(u => u.username);
}

export function* userList () {
  const User = this.orm().User;

  let offset = this.query.offset || 0;
  let users = yield User.findAndCountAll({
    attributes: {
      exclude: ['pass_hash', 'pass_salt']
    },
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
    navUsers: 'active',
    data: users,
    offset: offset
  });
}

export function* clientList () {
  const Client = this.orm().Client;

  let offset = this.query.offset || 0;
  let clients = yield Client.findAndCountAll({
    attributes: ['id', 'secret', 'redirect_uri', 'name'],
    offset: offset * 20,
    limit: 20,
    order: [
      ['name', 'ASC']
    ]
  });

  yield this.render('admin/clients', {
    navClients: 'active',
    data: clients,
    offset: offset
  });
}

export function* sendTotp () {
  const User = this.orm().User;
  const { username } = this.request.body;

  if (!username) {
    this.flash('error', 'Username is required');
    this.redirect(this._routes.admin.users);
    return;
  }

  try {
    // generate new totp key
    let res = yield User.update({
      totp_key: generateToken()
    }, {
      where: {
        username: username
      }
    });
    // send email
    if (res[0]) {
      let user = yield User.findOne({
        where: {
          username: username
        }
      });
      yield this.sendMail(user.email, 'send_totp', {
        username: user.username,
        cid: 'key',
        email: user.email,
        key: encodeKey(user.totp_key)
      }, [{
        filename: 'key.png',
        content: totpImage(user.email, user.totp_key),
        cid: 'key'
      }]);
    } else {
      this.flash('error', 'Update failed');
      this.redirect(this._routes.admin.users);
      return;
    }
    this.flash('success', 'Reset and send TOTP key successfully');
    this.redirect(this._routes.admin.users);
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Reset and send key failed');
    this.redirect(this._routes.admin.users);
  }
}

export function* addClient () {
  const Client = this.orm().Client;
  const { name, redirect_uri } = this.request.body;

  if (!name) {
    this.flash('error', 'Name is required');
    this.redirect(this._routes.admin.clients);
    return;
  }

  if (!redirect_uri) {
    this.flash('error', 'Redirect URI is required');
    this.redirect(this._routes.admin.clients);
    return;
  }

  try {
    // add one new
    yield Client.create({
      secret: generateToken(),
      name: name,
      redirect_uri: redirect_uri
    });

    this.flash('success', 'Add new client successfully');
    this.redirect(this._routes.admin.clients);
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Add new client failed');
    this.redirect(this._routes.admin.clients);
  }
}

export function* generateSecret () {
  const Client = this.orm().Client;
  const { id } = this.request.body;

  if (!id) {
    this.flash('error', 'ID is required');
    this.redirect(this._routes.admin.clients);
    return;
  }

  try {
    // generate new secret
    let res = yield Client.update({
      secret: generateToken()
    }, {
      where: {
        id: id
      }
    });
    if (res[0]) {
      this.flash('success', 'Generate new secret successfully');
      this.redirect(this._routes.admin.clients);
    } else {
      this.flash('error', 'Update failed');
      this.redirect(this._routes.admin.clients);
      return;
    }
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Generate new secret failed');
    this.redirect(this._routes.admin.clients);
  }
}

export function* addUser () {
  const { User, EmailCode, sequelize } = this.orm();
  const { username, email } = this.request.body;

  if (!username) {
    this.flash('error', 'Username is required');
    this.redirect(this._routes.admin.users);
    return;
  }

  if (!email) {
    this.flash('error', 'Email is required');
    this.redirect(this._routes.admin.users);
    return;
  }

  const t = yield sequelize.transaction();

  try {
    const password = rs.generate(8);
    const key = generateToken();
    // add one new
    const user = yield User.add({
      username: username,
      email: email,
      password: password,
      totp_key: key
    }, {
      transaction: t
    });
    // 生成code
    const code = yield EmailCode.create({
      user_id: user.username
    }, {
      transaction: t
    });
    // send email
    yield this.sendMail(user.email, 'add_user', {
      username: user.username,
      password: password,
      cid: 'key',
      email: user.email,
      key: encodeKey(key),
      ttl: this.config.emailCodeTTL / 3600,
      link: this.config.domain + this._routes.admin.password_change + '?code=' + code.id
    }, [{
      filename: 'key.png',
      content: totpImage(user.email, key),
      cid: 'key'
    }]);

    yield t.commit();

    this.flash('success', 'Add new user successfully');
    this.redirect(this._routes.admin.users);
  } catch (e) {
    console.error(e.stack);
    t.rollback();
    this.flash('error', 'Add new user failed');
    this.redirect(this._routes.admin.users);
  }
}

export function* roleList () {
  const { Role, Client, DicRole } = this.orm();

  const q = this.query.q || '';
  const offset = this.query.offset || 0;
  const roles = yield Role.findAndCountAll({
    attributes: ['id', 'user_id', 'client_id', 'role'],
    where: {
      user_id: {
        $like: '%' + q + '%'
      }
    },
    offset: offset * 20,
    limit: 20,
    order: [
      ['user_id', 'ASC']
    ]
  });

  const clients = yield Client.findAll();
  const dics = yield DicRole.findAll();
  const clientMap = clients.reduce((o, c) => {
    o[c.id] = c.name;
    return o;
  }, {});
  yield this.render('admin/roles', {
    navRoles: 'active',
    q: q,
    data: roles,
    clients: clients,
    clientMap: clientMap,
    dics: dics,
    offset: offset
  });
}

export function* addRole () {
  const { Role } = this.orm();
  const { user, client, role } = this.request.body;

  if (!user) {
    this.flash('error', 'User is required');
    this.redirect(this._routes.admin.roles);
    return;
  }

  if (!client) {
    this.flash('error', 'Client is required');
    this.redirect(this._routes.admin.roles);
    return;
  }

  if (!role) {
    this.flash('error', 'Role is required');
    this.redirect(this._routes.admin.roles);
    return;
  }

  try {
    // add one new
    yield Role.create({
      user_id: user,
      client_id: client,
      role: role
    });

    this.flash('success', 'Add new role successfully');
    this.redirect(this._routes.admin.roles);
  } catch (e) {
    console.error(e.stack);
    this.flash('error', 'Add new role failed, maybe it is existed');
    this.redirect(this._routes.admin.roles);
  }
}

export function* deleteRole () {
  const Role = this.orm().Role;
  const { id } = this.request.body;

  if (!id) {
    this.flash('error', 'Id is required');
    this.redirect(this._routes.admin.roles);
    return;
  }
  // Delete role
  const num = yield Role.destroy({
    where: { id }
  });

  if (num <= 0) {
    this.flash('error', 'Delete role failed, maybe it is not existed');
    this.redirect(this._routes.admin.roles);
    return;
  }

  this.flash('success', 'Delete role successfully');
  this.redirect(this._routes.admin.roles);
}
