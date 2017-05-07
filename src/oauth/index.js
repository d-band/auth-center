'use strict';

import { checkURI, buildURI } from '../util';

export default function (config) {
  function * authorize () {
    const Client = this.orm().Client;
    const Code = this.orm().Code;

    const user = this.session.user;
    const { client_id, redirect_uri, state } = this.query;

    this.assert(client_id, 400, 'client_id is missing.');

    const client = yield Client.findById(client_id);

    this.assert(client, 401, 'client_id is invalid.');

    let uri = client.redirect_uri;
    if (redirect_uri) {
      const isChecked = checkURI(client.redirect_uri, redirect_uri);
      this.assert(isChecked, 401, 'redirect_uri is invalid.', {
        returnTo: client.redirect_uri
      });
      uri = redirect_uri;
    }

    const code = yield Code.create({
      user_id: user.username,
      client_id: client.id,
      redirect_uri: uri
    });
    this.redirect(buildURI(uri, {
      code: code.id,
      state: state
    }));
  }

  function * accessToken () {
    const Client = this.orm().Client;
    const Token = this.orm().Token;
    const Code = this.orm().Code;

    const isForm = this.request.is('application/x-www-form-urlencoded');
    this.assert(isForm, 403, 'Content must be application/x-www-form-urlencoded');

    const { client_id, client_secret, code, redirect_uri, state } = this.request.body;

    this.assert(client_id, 400, 'client_id is missing.');
    this.assert(client_secret, 400, 'client_secret is missing.');
    this.assert(redirect_uri, 400, 'redirect_uri is missing.');
    this.assert(code, 400, 'code is missing.');

    const client = yield Client.findById(client_id);

    this.assert(client, 401, 'client_id is invalid.');
    this.assert(client.secret === client_secret, 401, 'client_secret is invalid.');

    const _code = yield Code.findById(code);

    this.assert(_code, 401, 'code is invalid.');

    const expiresAt = _code.createdAt.getTime() + (config.codeTTL * 1000);
    this.assert(expiresAt > Date.now(), 401, 'code expired.');

    const isChecked = checkURI(_code.redirect_uri, redirect_uri);
    this.assert(isChecked, 401, 'redirect_uri is invalid.');

    const token = yield Token.create({
      client_id: client.id,
      user_id: _code.user_id,
      ttl: config.accessTokenTTL
    });

    this.set('Cache-Control', 'no-store');
    this.set('Pragma', 'no-cache');
    this.body = {
      access_token: token.id,
      token_type: 'bearer',
      expires_in: token.ttl,
      state: state
    };
  }

  function * authenticate (next) {
    const Token = this.orm().Token;

    let tokenId = this.get('authorization');
    let matches = tokenId.match(/bearer\s(\S+)/i);
    if (!matches) {
      tokenId = this.query.access_token;
    } else {
      tokenId = matches[1];
    }

    this.assert(tokenId, 400, 'access_token is missing.');

    const token = yield Token.findById(tokenId);

    this.assert(token, 401, 'access_token is invalid.');

    const expiresAt = token.createdAt.getTime() + (token.ttl * 1000);
    this.assert(expiresAt > Date.now(), 401, 'access_token expired.');

    this._userId = token.user_id;
    yield next;
  }

  return {
    authorize,
    accessToken,
    authenticate
  };
}
