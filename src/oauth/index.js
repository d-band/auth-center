'use strict';

import { checkURI, buildURI } from '../util';

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

    const { client_id, client_secret, code, redirect_uri, state } = ctx.request.body;

    ctx.assert(client_id, 400, 'client_id is missing.');
    ctx.assert(client_secret, 400, 'client_secret is missing.');
    ctx.assert(redirect_uri, 400, 'redirect_uri is missing.');
    ctx.assert(code, 400, 'code is missing.');

    const client = await Client.findByPk(client_id);

    ctx.assert(client, 401, 'client_id is invalid.');
    ctx.assert(client.secret === client_secret, 401, 'client_secret is invalid.');

    const _code = await Code.findByPk(code);

    ctx.assert(_code, 401, 'code is invalid.');

    const expiresAt = _code.createdAt.getTime() + (config.codeTTL * 1000);
    ctx.assert(expiresAt > Date.now(), 401, 'code expired.');

    const isChecked = checkURI(_code.redirect_uri, redirect_uri);
    ctx.assert(isChecked, 401, 'redirect_uri is invalid.');

    const token = await Token.create({
      client_id: client.id,
      user_id: _code.user_id,
      ttl: config.accessTokenTTL
    });

    ctx.set('Cache-Control', 'no-store');
    ctx.set('Pragma', 'no-cache');
    ctx.body = {
      access_token: token.id,
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
