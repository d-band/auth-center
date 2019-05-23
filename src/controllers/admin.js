'use strict';

import qs from 'querystring';
import { generateId, encodeKey, totpImage } from '../util';

export async function checkLogin (ctx, next) {
  if (ctx.session.user) {
    if (ctx.session.user.is_admin) {
      ctx.state.user = ctx.session.user;
      await next();
    } else {
      ctx.redirect(ctx._routes.home);
    }
  } else {
    ctx.session.returnTo = ctx.url;
    ctx.redirect(ctx._routes.login);
  }
}

export async function searchUser (ctx) {
  const { User } = ctx.orm();
  const q = ctx.request.body.q || '';
  const users = await User.findAll({
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
  ctx.body = users.map(u => u.email);
}

export async function userList (ctx) {
  const { User } = ctx.orm();
  const page = parseInt(ctx.query.p, 10) || 1;
  const query = ctx.query.q || '';
  const limit = 20;
  const offset = (page - 1) * limit;
  const where = { enable: 1 };
  if (query) {
    where['email'] = { $like: `%${query}%` };
  }
  const users = await User.findAndCountAll({
    where,
    limit,
    offset,
    order: [['email', 'ASC']],
    attributes: {
      exclude: ['pass_hash', 'pass_salt']
    }
  });

  await ctx.render('admin/users', {
    page,
    users,
    query,
    navUsers: 'active',
    total: Math.ceil(users.count / limit),
    link: p => `?${qs.stringify({ q: query, p })}`
  });
}

export async function clientList (ctx) {
  const { Client } = ctx.orm();
  const page = parseInt(ctx.query.p, 10) || 1;
  const query = ctx.query.q || '';
  const limit = 20;
  const offset = (page - 1) * limit;
  const where = {};
  if (query) {
    where['name'] = { $like: `%${query}%` };
  }
  const clients = await Client.findAndCountAll({
    where,
    limit,
    offset,
    order: [['name', 'ASC']],
    attributes: ['id', 'secret', 'redirect_uri', 'name', 'name_cn']
  });

  await ctx.render('admin/clients', {
    page,
    query,
    clients,
    navClients: 'active',
    total: Math.ceil(clients.count / limit),
    link: p => `?${qs.stringify({ q: query, p })}`
  });
}

export async function sendTotp (ctx) {
  const { User } = ctx.orm();
  const { id } = ctx.request.body;

  if (!id) {
    ctx.flash('error', 'ID is required');
    ctx.redirect(ctx._routes.admin.users);
    return;
  }

  try {
    // generate new totp key
    const res = await User.update({
      totp_key: generateId()
    }, {
      where: { id }
    });
    // send email
    if (res[0]) {
      const user = await User.findByPk(id);
      await ctx.sendMail(user.email, 'send_totp', {
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
      ctx.flash('error', 'Update failed');
      ctx.redirect(ctx._routes.admin.users);
      return;
    }
    ctx.flash('success', 'Reset and send TOTP key successfully');
    ctx.redirect(ctx._routes.admin.users);
  } catch (e) {
    console.error(e.stack);
    ctx.flash('error', 'Reset and send key failed');
    ctx.redirect(ctx._routes.admin.users);
  }
}

export async function addClient (ctx) {
  const { Client } = ctx.orm();
  const { name, name_cn, redirect_uri } = ctx.request.body;

  if (!name) {
    ctx.flash('error', 'Name is required');
    ctx.redirect(ctx._routes.admin.clients);
    return;
  }

  if (!name_cn) {
    ctx.flash('error', 'Name CN is required');
    ctx.redirect(ctx._routes.admin.clients);
    return;
  }

  if (!redirect_uri) {
    ctx.flash('error', 'Redirect URI is required');
    ctx.redirect(ctx._routes.admin.clients);
    return;
  }

  try {
    // add one new
    await Client.create({
      secret: generateId(),
      name: name,
      name_cn: name_cn,
      redirect_uri: redirect_uri
    });
    ctx.flash('success', 'Add new client successfully');
    ctx.redirect(ctx._routes.admin.clients);
  } catch (e) {
    console.error(e.stack);
    ctx.flash('error', 'Add new client failed');
    ctx.redirect(ctx._routes.admin.clients);
  }
}

export async function generateSecret (ctx) {
  const { Client } = ctx.orm();
  const { id } = ctx.request.body;

  if (!id) {
    ctx.flash('error', 'ID is required');
    ctx.redirect(ctx._routes.admin.clients);
    return;
  }

  try {
    // generate new secret
    const res = await Client.update({
      secret: generateId()
    }, {
      where: { id }
    });
    if (res[0]) {
      ctx.flash('success', 'Generate new secret successfully');
      ctx.redirect(ctx._routes.admin.clients);
    } else {
      ctx.flash('error', 'Update failed');
      ctx.redirect(ctx._routes.admin.clients);
      return;
    }
  } catch (e) {
    console.error(e.stack);
    ctx.flash('error', 'Generate new secret failed');
    ctx.redirect(ctx._routes.admin.clients);
  }
}

export async function roleList (ctx) {
  const { User, Role, Client, DicRole } = ctx.orm();
  const page = parseInt(ctx.query.p, 10) || 1;
  const query = ctx.query.q || '';
  const where = {};
  if (query) {
    const temp = await User.findAll({
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
  const roles = await Role.findAndCountAll({
    where,
    limit,
    offset,
    order: [['user_id', 'ASC']],
    attributes: ['id', 'user_id', 'client_id', 'role']
  });
  const users = await User.findAll({
    attributes: ['id', 'email'],
    where: {
      id: { $in: roles.rows.map(v => v.user_id) }
    }
  });
  const userMap = users.reduce((o, c) => {
    o[c.id] = c.email;
    return o;
  }, {});

  const clients = await Client.findAll();
  const dics = await DicRole.findAll();
  const clientMap = clients.reduce((o, c) => {
    o[c.id] = c.name;
    return o;
  }, {});
  await ctx.render('admin/roles', {
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

export async function addRole (ctx) {
  const { Role, User } = ctx.orm();
  const { email, client, role } = ctx.request.body;

  if (!email) {
    ctx.flash('error', 'Email is required');
    ctx.redirect(ctx._routes.admin.roles);
    return;
  }

  if (!client) {
    ctx.flash('error', 'Client is required');
    ctx.redirect(ctx._routes.admin.roles);
    return;
  }

  if (!role) {
    ctx.flash('error', 'Role is required');
    ctx.redirect(ctx._routes.admin.roles);
    return;
  }

  const user = await User.findByEmail(email);
  if (!user) {
    ctx.flash('error', 'User is not existed');
    ctx.redirect(ctx._routes.admin.roles);
    return;
  }

  try {
    // add one new
    await Role.create({
      user_id: user.id,
      client_id: client,
      role: role
    });

    ctx.flash('success', 'Add new role successfully');
    ctx.redirect(ctx._routes.admin.roles);
  } catch (e) {
    console.error(e.stack);
    ctx.flash('error', 'Add new role failed, maybe it is existed');
    ctx.redirect(ctx._routes.admin.roles);
  }
}

export async function deleteRole (ctx) {
  const { Role } = ctx.orm();
  const { id } = ctx.request.body;

  if (!id) {
    ctx.flash('error', 'Id is required');
    ctx.redirect(ctx._routes.admin.roles);
    return;
  }
  // Delete role
  const num = await Role.destroy({
    where: { id }
  });

  if (num <= 0) {
    ctx.flash('error', 'Delete role failed, maybe it is not existed');
    ctx.redirect(ctx._routes.admin.roles);
    return;
  }

  ctx.flash('success', 'Delete role successfully');
  ctx.redirect(ctx._routes.admin.roles);
}
