'use strict';

import { checkURI, buildURI } from '../util';
import { TokenErrors, CodeErrors, assert } from './errors';

export default function (config) {
  async function authorize (ctx) {
    const { Client, Code } = ctx.orm();

    const user = ctx.session.user;
    const { client_id, response_type, redirect_uri, state } = ctx.query;
    assert(ctx, client_id, CodeErrors.unrecognized_client_id('client_id is missing'));

    const client = await Client.findByPk(client_id);
    assert(ctx, client, CodeErrors.unrecognized_client_id('client not found'));

    if (redirect_uri) {
      const isChecked = checkURI(client.redirect_uri, redirect_uri);
      assert(ctx, isChecked, CodeErrors.invalid_redirect_uri('redirect_uri is invalid'));
    }
    const uri = redirect_uri || client.redirect_uri;
    if (!response_type) {
      return ctx.redirect(buildURI(uri, {
        state,
        error: 'invalid_request'
      }));
    }
    if (response_type !== 'code') {
      return ctx.redirect(buildURI(uri, {
        state,
        error: 'unsupported_response_type'
      }));
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
    assert(ctx, isForm, TokenErrors.invalid_request('content-type is invalid'));

    const { grant_type, client_id, client_secret, state } = ctx.request.body;
    assert(ctx, client_id, TokenErrors.invalid_request('client_id is missing'));
    assert(ctx, client_secret, TokenErrors.invalid_request('client_secret is missing'));

    const client = await Client.findByPk(client_id);
    assert(ctx, client, TokenErrors.invalid_client('client_id is invalid'));
    assert(ctx, client.secret === client_secret, TokenErrors.invalid_client('client_secret is invalid'));

    const obj = {
      client_id: client.id,
      ttl: config.accessTokenTTL
    };
    if (grant_type === 'authorization_code') {
      const { code: code_id, redirect_uri } = ctx.request.body;
      assert(ctx, redirect_uri, TokenErrors.invalid_request('redirect_uri is missing'));
      assert(ctx, code_id, TokenErrors.invalid_request('code is missing'));

      const code = await Code.findByPk(code_id, {
        where: { client_id: client.id }
      });
      assert(ctx, code, TokenErrors.invalid_grant('code is invalid'));

      const expiresAt = code.createdAt.getTime() + (config.codeTTL * 1000);
      assert(ctx, expiresAt > Date.now(), TokenErrors.invalid_grant('code has expired'));

      const isChecked = checkURI(code.redirect_uri, redirect_uri);
      assert(ctx, isChecked, TokenErrors.invalid_grant('redirect_uri is invalid'));
      obj.user_id = code.user_id;
      await code.destroy();
    } else if (grant_type === 'refresh_token') {
      const { refresh_token } = ctx.request.body;
      assert(ctx, refresh_token, TokenErrors.invalid_request('refresh_token is missing'));

      const token = await Token.findOne({
        where: {
          refresh_token,
          client_id: client.id
        }
      });
      assert(ctx, token, TokenErrors.invalid_grant('refresh_token is invalid'));

      const expiresAt = token.createdAt.getTime() + (config.refreshTokenTTL * 1000);
      assert(ctx, expiresAt > Date.now(), TokenErrors.invalid_grant('refresh_token has expired'));
      // Reuse refresh token
      obj.user_id = token.user_id;
      obj.refresh_token = refresh_token;
      await token.destroy();
    } else {
      assert(ctx, false, TokenErrors.unsupported_grant_type('unsupported grant type'));
    }
    const result = await Token.create(obj);
    ctx.set('Cache-Control', 'no-store');
    ctx.set('Pragma', 'no-cache');
    ctx.body = {
      access_token: result.id,
      refresh_token: result.refresh_token,
      token_type: 'bearer',
      expires_in: result.ttl,
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
    assert(ctx, tokenId, TokenErrors.invalid_token('access_token is missing'));

    const token = await Token.findByPk(tokenId);
    assert(ctx, token, TokenErrors.invalid_token('access_token is invalid'));

    const expiresAt = token.createdAt.getTime() + (token.ttl * 1000);
    assert(ctx, expiresAt > Date.now(), TokenErrors.invalid_token('access_token has expired'));

    ctx._userId = token.user_id;
    await next();
  }

  return {
    authorize,
    accessToken,
    authenticate
  };
}
