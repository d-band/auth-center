'use strict';

import isEmail from 'validator/lib/isEmail';
import randomColor from 'randomcolor';
import { totp, getCaptcha } from '../util';

export async function home (ctx) {
  const { Role, Client } = ctx.orm();
  const { user } = ctx.session;
  const roles = await Role.findAll({
    attributes: ['client_id'],
    where: { user_id: user.id }
  });
  const clients = await Client.findAll({
    attributes: ['name', 'name_cn', 'redirect_uri'],
    where: {
      id: { $in: roles.map(r => r.client_id) },
      redirect_uri: { $ne: '' }
    }
  });
  const colors = randomColor({
    luminosity: 'dark',
    count: clients.length
  });
  await ctx.render('main/home', { user, clients, colors });
}

export async function security (ctx) {
  const { user } = ctx.session;
  await ctx.render('main/security', { user });
}

export async function securityChange (ctx) {
  const { User } = ctx.orm();
  const { oldpwd, newpwd, renewpwd } = ctx.request.body;
  const { user } = ctx.session;

  if (!oldpwd || !newpwd || !renewpwd) {
    ctx.flash('error', 'Password is required');
    ctx.redirect(ctx._routes.security);
    return;
  }

  if (newpwd === oldpwd) {
    ctx.flash('error', 'Old and new password can not be the same');
    ctx.redirect(ctx._routes.security);
    return;
  }

  // 验证一把新密码是否相同
  if (newpwd !== renewpwd) {
    ctx.flash('error', 'Passwords do not match');
    ctx.redirect(ctx._routes.security);
    return;
  }

  if (newpwd.length < 8) {
    ctx.flash('error', 'Password length atleast 8');
    ctx.redirect(ctx._routes.security);
    return;
  }

  const auth = await User.auth(user.email, oldpwd);

  if (!auth) {
    ctx.flash('error', 'Old password is invalid');
    ctx.redirect(ctx._routes.security);
    return;
  }

  await User.changePassword(user.id, newpwd);
  await ctx.log(user.email, 'CHANGE_PWD');

  ctx.session.user = null;
  ctx.flash('success', 'Password have been changed');
  ctx.redirect(ctx._routes.login);
}

export async function checkLogin (ctx, next) {
  if (ctx.session.user) {
    await next();
  } else {
    ctx.session.returnTo = ctx.url;
    ctx.redirect(ctx._routes.login);
  }
}

export async function login (ctx) {
  if (ctx.session.user) {
    const returnTo = ctx.session.returnTo;
    ctx.session.returnTo = null;
    ctx.redirect(returnTo || ctx._routes.home);
    return;
  }
  await ctx.render('auth/login', {
    isTOTP: ctx.config.isTOTP
  });
}

export async function session (ctx) {
  const { User } = ctx.orm();
  const { email, password, token, terms } = ctx.request.body;

  if (!email) {
    ctx.flash('error', 'Email is required');
    ctx.redirect(ctx._routes.login);
    return;
  }
  if (!password) {
    ctx.flash('error', 'Password is required');
    ctx.redirect(ctx._routes.login);
    return;
  }
  if (ctx.config.isTOTP && !token) {
    ctx.flash('error', 'Token is required');
    ctx.redirect(ctx._routes.login);
    return;
  }
  if (ctx.config.terms && String(terms) !== '1') {
    ctx.flash('error', 'You should agree the terms');
    ctx.redirect(ctx._routes.login);
    return;
  }

  // 5分钟内限制使用5次
  const count = await ctx.logCount(email, 'LOGIN_ERR', 300);
  if (count >= 5) {
    ctx.flash('error', 'Please try 5 minutes later');
    ctx.redirect(ctx._routes.login);
    return;
  }

  const user = await User.auth(email, password);
  if (!user) {
    await ctx.log(email, 'LOGIN_ERR');
    ctx.flash('error', 'Email or password is invalid');
    ctx.redirect(ctx._routes.login);
    return;
  }
  if (ctx.config.isTOTP && !totp.check(token, user.totp_key)) {
    await ctx.log(email, 'LOGIN_ERR');
    ctx.flash('error', 'Token is invalid');
    ctx.redirect(ctx._routes.login);
    return;
  }

  const returnTo = ctx.session.returnTo;

  ctx.session.returnTo = null;
  delete user.totp_key;
  ctx.session.user = user;
  await ctx.log(email, 'LOGIN');
  ctx.redirect(returnTo || ctx._routes.home);
}

export async function logout (ctx, next) {
  const returnTo = ctx.query.return_to;
  ctx.session.user = null;
  ctx.redirect(returnTo || ctx._routes.login);
  await next();
}

export async function passwordResetPage (ctx) {
  await ctx.render('auth/reset');
}

export async function passwordChangePage (ctx) {
  const { email, token } = ctx.query;
  await ctx.render('auth/change', {
    token,
    email,
    title: 'Change password'
  });
}

export async function passwordChange (ctx) {
  const { User, Recovery } = ctx.orm();
  const { user } = ctx;
  const { password, password2, email } = ctx.request.body;

  if (!password || !password2) {
    ctx.flash('error', 'Password is required');
    ctx.redirect('back');
    return;
  }

  if (password !== password2) {
    ctx.flash('error', 'Passwords do not match');
    ctx.redirect('back');
    return;
  }

  if (password.length < 8) {
    ctx.flash('error', 'Password length atleast 8');
    ctx.redirect('back');
    return;
  }

  // TODO: add transaction
  await User.changePassword(user.id, password);
  await ctx.log(email, 'CHANGE_PWD');
  await Recovery.destroy({
    where: { user_id: user.id }
  });

  ctx.flash('success', 'Password have been changed');
  ctx.redirect(ctx._routes.login);
}

export async function getInfo (ctx) {
  const { User } = ctx.orm();

  ctx.body = await User.findByPk(ctx._userId, {
    attributes: ['id', 'email'],
    raw: true
  });
}

export function checkToken (key) {
  return async (ctx, next) => {
    const { email } = ctx.request.body;
    const timeKey = `${key}_TIME`;
    const lastTime = ctx.session[timeKey];

    ctx.assert(email, 400, 'Email is required');
    ctx.assert(isEmail(email), 400, 'Email is invalid');
    // wait 1 minute
    const min = 60 * 1000;
    const now = Date.now();
    ctx.assert(!lastTime || (now - lastTime) > min, 400, 'Try again in a minute');

    const count = await ctx.logCount(email, key, ctx.config.tokenLimit);
    ctx.assert(count < 5, 400, `Only 5 times allowed within ${ctx.config.tokenLimit / 3600} hours`);

    await next();

    await ctx.log(email, key);
    ctx.session[timeKey] = now;
    ctx.body = { code: 0 };
  };
}

export async function loginToken (ctx) {
  const { User } = ctx.orm();
  const { email } = ctx.request.body;
  const user = await User.findOne({
    attributes: ['id', 'totp_key'],
    where: { email, enable: 1 }
  });

  if (!user) return;

  await ctx.sendMail(email, 'login_token', {
    username: email,
    sender: ctx.config.mail.from,
    token: totp.generate(user.totp_key)
  });
}

export async function resetpwdToken (ctx) {
  const { User, Recovery } = ctx.orm();
  const { email } = ctx.request.body;
  const user = await User.findOne({
    attributes: ['id'],
    where: { email, enable: 1 }
  });

  if (!user) return;

  // 删除之前的Token
  await Recovery.destroy({
    where: { user_id: user.id }
  });
  const recovery = await Recovery.create({
    user_id: user.id,
    token: getCaptcha(8)
  });
  await ctx.sendMail(email, 'resetpwd_token', {
    username: email,
    sender: ctx.config.mail.from,
    token: recovery.token
  });
}

export async function checkResetToken (ctx, next) {
  const { User, Recovery } = ctx.orm();
  const email = ctx.query.email || ctx.request.body.email;
  const token = ctx.query.token || ctx.request.body.token;

  if (!email) {
    ctx.flash('error', 'Email is required');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  if (!token) {
    ctx.flash('error', 'Captcha is required');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  // 1分钟内限制使用3次，超过次数删除token
  const count = await ctx.logCount(email, 'RESETPWD_ERR', 60);
  if (count >= 3) {
    ctx.flash('error', 'Try again in a minute');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }
  const user = await User.findOne({
    attributes: ['id'],
    where: { email, enable: 1 }
  });
  if (!user) {
    await ctx.log(email, 'RESETPWD_ERR');
    ctx.flash('error', 'Email is invalid');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }
  // token是否存在
  const recovery = await Recovery.findOne({
    attributes: ['createdAt'],
    where: {
      token,
      user_id: user.id
    }
  });
  const time = Date.now() - (1000 * ctx.config.recoveryTokenTTL);
  if (!recovery || recovery.createdAt.getTime() < time) {
    await ctx.log(email, 'RESETPWD_ERR');
    ctx.flash('error', 'Captcha is invalid');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }
  ctx.user = user;
  await next();
}
