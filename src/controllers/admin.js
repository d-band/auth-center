'use strict';

import qs from 'querystring';
import { generateToken, encodeKey, totpImage } from '../util';

export function * checkLogin (next) {
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

export function * searchUser () {
  const User = this.orm().User;
  const q = this.request.body.q || '';
  const users = yield User.findAll({
    attributes: ['email'],
    where: {
      enable: 1,
      email: {
        $like: q + '%'
      }
    },
    offset: 0,
    limit: 15
  });
  this.body = users.map(u => u.email);
}

export function * userList () {
  const { User } = this.orm();
  const page = parseInt(this.query.p, 10) || 1;
  const query = this.query.q || '';
  const limit = 20;
  const offset = (page - 1) * limit;
  const where = { enable: 1 };
  if (query) {
    where['email'] = { $like: `%${query}%` };
  }
  const users = yield User.findAndCountAll({
    where,
    limit,
    offset,
    order: 'email ASC',
    attributes: {
      exclude: ['pass_hash', 'pass_salt']
    }
  });

  yield this.render('admin/users', {
    page,
    users,
    query,
    navUsers: 'active',
    total: Math.ceil(users.count / limit),
    link: p => `?${qs.stringify({ q: query, p })}`
  });
}

export function * clientList () {
  const { Client } = this.orm();
  const page = parseInt(this.query.p, 10) || 1;
  const query = this.query.q || '';
  const limit = 20;
  const offset = (page - 1) * limit;
  const where = {};
  if (query) {
    where['name'] = { $like: `%${query}%` };
  }
  const clients = yield Client.findAndCountAll({
    where,
    limit,
    offset,
    order: 'name ASC',
    attributes: ['id', 'secret', 'redirect_uri', 'name']
  });

  yield this.render('admin/clients', {
    page,
    query,
    clients,
    navClients: 'active',
    total: Math.ceil(clients.count / limit),
    link: p => `?${qs.stringify({ q: query, p })}`
  });
}

export function * sendTotp () {
  const User = this.orm().User;
  const { id } = this.request.body;

  if (!id) {
    this.flash('error', 'ID is required');
    this.redirect(this._routes.admin.users);
    return;
  }

  try {
    // generate new totp key
    let res = yield User.update({
      totp_key: generateToken()
    }, {
      where: { id }
    });
    // send email
    if (res[0]) {
      let user = yield User.findById(id);
      yield this.sendMail(user.email, 'send_totp', {
        username: user.email,
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

export function * addClient () {
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

export function * generateSecret () {
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

export function * roleList () {
  const { User, Role, Client, DicRole } = this.orm();
  const page = parseInt(this.query.p, 10) || 1;
  const query = this.query.q || '';
  const where = {};
  if (query) {
    const temp = yield User.findAll({
      offset: 0,
      limit: 100,
      attributes: ['id'],
      where: {
        email: { $like: `%${query}%` }
      }
    });
    where['user_id'] = {
      $in: temp.map(v => v.id)
    };
  }
  const limit = 20;
  const offset = (page - 1) * limit;
  const roles = yield Role.findAndCountAll({
    where,
    limit,
    offset,
    order: 'user_id ASC',
    attributes: ['id', 'user_id', 'client_id', 'role']
  });
  const users = yield User.findAll({
    attributes: ['id', 'email'],
    where: {
      id: { $in: roles.rows.map(v => v.user_id) }
    }
  });
  const userMap = users.reduce((o, c) => {
    o[c.id] = c.email;
    return o;
  }, {});

  const clients = yield Client.findAll();
  const dics = yield DicRole.findAll();
  const clientMap = clients.reduce((o, c) => {
    o[c.id] = c.name;
    return o;
  }, {});
  yield this.render('admin/roles', {
    dics,
    page,
    query,
    roles,
    clients,
    userMap,
    clientMap,
    navRoles: 'active',
    total: Math.ceil(roles.count / limit),
    link: p => `?${qs.stringify({ q: query, p })}`
  });
}

export function * addRole () {
  const { Role, User } = this.orm();
  const { email, client, role } = this.request.body;

  if (!email) {
    this.flash('error', 'Email is required');
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

  const user = yield User.findByEmail(email);
  if (!user) {
    this.flash('error', 'User is not existed');
    this.redirect(this._routes.admin.roles);
    return;
  }

  try {
    // add one new
    yield Role.create({
      user_id: user.id,
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

export function * deleteRole () {
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
