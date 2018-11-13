'use strict';

import isEmail from 'validator/lib/isEmail';
import { totp } from 'notp';
import randomColor from 'randomcolor';

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
  await ctx.render('home', { user, clients, colors });
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
  await ctx.render('login', {
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

  const user = await User.auth(email, password);

  if (!user) {
    ctx.flash('error', 'Email or password is invalid');
    ctx.redirect(ctx._routes.login);
    return;
  }

  if (ctx.config.isTOTP && !totp.verify(token, user.totp_key, { window: 20 })) {
    ctx.flash('error', 'Token is invalid');
    ctx.redirect(ctx._routes.login);
    return;
  }

  const returnTo = ctx.session.returnTo;

  ctx.session.returnTo = null;
  ctx.session.user = user;
  await ctx.log(user.id, 'LOGIN');
  ctx.redirect(returnTo || ctx._routes.home);
}

export async function logout (ctx, next) {
  const returnTo = ctx.query.return_to;
  ctx.session.user = null;
  ctx.redirect(returnTo || ctx._routes.login);
  await next();
}

export async function passwordResetPage (ctx) {
  await ctx.render('reset');
}

export async function passwordReset (ctx) {
  const { User, EmailCode } = ctx.orm();
  const { email } = ctx.request.body;

  if (!email || !isEmail(email)) {
    ctx.flash('error', 'Email is empty or invalid type');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  const user = await User.findByEmail(email);
  if (!user) {
    ctx.flash('error', 'User not found');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  try {
    const code = await EmailCode.create({
      user_id: user.id
    });
    await ctx.sendMail(user.email, 'password_reset', {
      username: user.email,
      ttl: ctx.config.emailCodeTTL / 3600,
      link: ctx.config.domain + ctx._routes.password_change + '?code=' + code.id
    });
    ctx.flash('success', 'Check your email for a link to reset your password.');
    ctx.redirect(ctx._routes.login);
  } catch (e) {
    console.error(e.stack);
    ctx.flash('error', 'Send email failed');
    ctx.redirect(ctx._routes.password_reset);
  }
}

export async function passwordChangePage (ctx) {
  const { EmailCode } = ctx.orm();

  const codeId = ctx.query.code;

  if (!codeId) {
    ctx.flash('error', 'Code is required');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  const code = await EmailCode.findById(codeId);
  if (!code) {
    ctx.flash('error', 'Code is invalid');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  const expiresAt = code.createdAt.getTime() + (ctx.config.emailCodeTTL * 1000);
  if (expiresAt < Date.now()) {
    ctx.flash('error', 'Code is expired');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }
  await ctx.render('change', {
    codeId: codeId,
    title: 'Change password'
  });
}

export async function passwordChange (ctx) {
  const { User, EmailCode } = ctx.orm();
  const { password, password2, codeId } = ctx.request.body;

  if (!codeId) {
    ctx.flash('error', 'Code is required');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  const code = await EmailCode.findById(codeId);
  if (!code) {
    ctx.flash('error', 'Code is invalid');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  const expiresAt = code.createdAt.getTime() + (ctx.config.emailCodeTTL * 1000);
  if (expiresAt < Date.now()) {
    ctx.flash('error', 'Code is expired');
    ctx.redirect(ctx._routes.password_reset);
    return;
  }

  if (!password || !password2 || password !== password2 || password.length < 8) {
    ctx.flash('error', 'Password is invalid');
    ctx.redirect('back');
    return;
  }

  // TODO: add transaction
  await User.changePassword(code.user_id, password);
  await ctx.log(code.user_id, 'CHANGE_PWD');
  await EmailCode.destroy({
    where: {
      id: codeId
    }
  });

  ctx.flash('success', 'Password have changed');
  ctx.redirect(ctx._routes.login);
}

export async function getInfo (ctx) {
  const { User } = ctx.orm();

  ctx.body = await User.findById(ctx._userId, {
    attributes: ['id', 'email'],
    raw: true
  });
}

export async function sendToken (ctx) {
  const { User } = ctx.orm();
  const { email } = ctx.request.body;
  const { lastTime } = ctx.session;

  ctx.assert(email, 400, 'Email is required');
  // wait 1 minute
  const min = 60 * 1000;
  const now = Date.now();
  ctx.assert(!lastTime || (now - lastTime) > min, 400, 'Try again in a minute');

  const user = await User.findByEmail(email);
  ctx.assert(user, 400, 'User is not found');

  await ctx.sendMail(email, 'send_token', {
    username: email,
    sender: ctx.config.mail.from,
    token: totp.gen(user.totp_key)
  });

  ctx.session.lastTime = now;

  ctx.body = { code: 0 };
}
