'use strict';

import { checkURI, buildURI, generateId } from '../util';

export default function (config) {
  async function authorize (ctx) {
    const { Client, Code } = ctx.orm();

    const user = ctx.session.user;
    const { client_id, redirect_uri, state } = ctx.query;

    ctx.assert(client_id, 400, 'client_id is missing.');

    const client = await Client.findByPk(client_id);

    ctx.assert(client, 401, 'client_id is invalid.');

    let uri = client.redirect_uri;
    if (redirect_uri) {
      const isChecked = checkURI(client.redirect_uri, redirect_uri);
      ctx.assert(isChecked, 401, 'redirect_uri is invalid.', {
        returnTo: client.redirect_uri
      });
      uri = redirect_uri;
    }

    const code = await Code.create({
      user_id: user.id,
      client_id: client.id,
      redirect_uri: uri
    });
    ctx.redirect(buildURI(uri, {
      code: code.id,
      state: state
    }));
  }

  async function accessToken (ctx) {
    const { Client, Token, Code } = ctx.orm();

    const isForm = ctx.request.is('application/x-www-form-urlencoded');
    ctx.assert(isForm, 403, 'Content must be application/x-www-form-urlencoded');

    const { grant_type, client_id, client_secret, state } = ctx.request.body;
    ctx.assert(client_id, 400, 'client_id is missing.');
    ctx.assert(client_secret, 400, 'client_secret is missing.');

    const client = await Client.findByPk(client_id);
    ctx.assert(client, 401, 'client_id is invalid.');
    ctx.assert(client.secret === client_secret, 401, 'client_secret is invalid.');

    let token;
    if (grant_type === 'authorization_code') {
      const { code: code_id, redirect_uri } = ctx.request.body;
      ctx.assert(redirect_uri, 400, 'redirect_uri is missing.');
      ctx.assert(code_id, 400, 'code is missing.');

      const code = await Code.findByPk(code_id, {
        where: { client_id: client.id }
      });
      ctx.assert(code, 401, 'code is invalid.');

      const expiresAt = code.createdAt.getTime() + (config.codeTTL * 1000);
      ctx.assert(expiresAt > Date.now(), 401, 'code expired.');

      const isChecked = checkURI(code.redirect_uri, redirect_uri);
      ctx.assert(isChecked, 401, 'redirect_uri is invalid.');
      // Create access token and refresh token
      token = await Token.create({
        user_id: code.user_id,
        client_id: client.id,
        ttl: config.accessTokenTTL,
        refresh_token: generateId()
      });
      await code.destroy();
    } else if (grant_type === 'refresh_token') {
      const { refresh_token } = ctx.request.body;
      ctx.assert(refresh_token, 400, 'refresh_token is missing.');

      token = await Token.findOne({
        where: {
          refresh_token,
          client_id: client.id
        }
      });
      ctx.assert(token, 401, 'refresh_token is invalid.');

      const expiresAt = token.createdAt.getTime() + (config.refreshTokenTTL * 1000);
      ctx.assert(expiresAt > Date.now(), 401, 'refresh_token expired.');
      // Reuse refresh token
      await token.update({
        id: generateId(),
        createdAt: new Date()
      });
    } else {
      ctx.throw(501, 'unsupported grant type');
    }
    ctx.set('Cache-Control', 'no-store');
    ctx.set('Pragma', 'no-cache');
    ctx.body = {
      access_token: token.id,
      refresh_token: token.refresh_token,
      token_type: 'bearer',
      expires_in: token.ttl,
      state: state
    };
  }

  async function authenticate (ctx, next) {
    const { Token } = ctx.orm();

    let tokenId = ctx.get('authorization');
    const matches = tokenId.match(/bearer\s(\S+)/i);
    if (!matches) {
      tokenId = ctx.query.access_token;
    } else {
      tokenId = matches[1];
    }

    ctx.assert(tokenId, 400, 'access_token is missing.');

    const token = await Token.findByPk(tokenId);

    ctx.assert(token, 401, 'access_token is invalid.');

    const expiresAt = token.createdAt.getTime() + (token.ttl * 1000);
    ctx.assert(expiresAt > Date.now(), 401, 'access_token expired.');

    ctx._userId = token.user_id;
    await next();
  }

  return {
    authorize,
    accessToken,
    authenticate
  };
}
