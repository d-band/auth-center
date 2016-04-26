'use strict';

import { checkURI, buildURI } from '../util';

export default function(config) {
  function * authorize() {
    const Client = this.orm().Client;
    const Code = this.orm().Code;

    let user = this.session.user;
    let {client_id, redirect_uri, state} = this.query;

    this.assert(client_id, 400, 'client_id is missing.');

    let client = yield Client.findById(client_id);

    this.assert(client, 401, 'client_id is invalid.');

    if (redirect_uri) {
      let isChecked = checkURI(client.redirect_uri, redirect_uri);
      this.assert(isChecked, 401, 'redirect_uri is invalid.', {
        returnTo: client.redirect_uri
      });
    } else {
      redirect_uri = client.redirect_uri;
    }

    let code = yield Code.create({
      user_id: user.username,
      client_id: client.id,
      redirect_uri: redirect_uri
    });

    this.redirect(buildURI(redirect_uri, {
      code: code.id,
      state: state
    }));
  }

  function * accessToken() {
    const Client = this.orm().Client;
    const Token = this.orm().Token;
    const Code = this.orm().Code;

    let isForm = this.request.is('application/x-www-form-urlencoded');
    this.assert(isForm, 403, 'Content must be application/x-www-form-urlencoded');

    let {client_id, client_secret, code, redirect_uri, state} = this.request.body;

    this.assert(client_id, 400, 'client_id is missing.');
    this.assert(client_secret, 400, 'client_secret is missing.');
    this.assert(redirect_uri, 400, 'redirect_uri is missing.');
    this.assert(code, 400, 'code is missing.');

    let client = yield Client.findById(client_id);

    this.assert(client, 401, 'client_id is invalid.');
    this.assert(client.secret === client_secret, 401, 'client_secret is invalid.');

    let _code = yield Code.findById(code);

    this.assert(_code, 401, 'code is invalid.');

    let expiresAt = _code.createdAt.getTime() + config.codeTTL * 1000;
    this.assert(expiresAt > Date.now(), 401, 'code expired.');

    let isChecked = checkURI(_code.redirect_uri, redirect_uri);
    this.assert(isChecked, 401, 'redirect_uri is invalid.');

    let token = yield Token.create({
      client_id: client.id,
      user_id: _code.user_id
    });

    this.set('Cache-Control', 'no-store');
    this.set('Pragma', 'no-cache');
    this.body = {
      access_token: token.id,
      token_type: 'bearer',
      expires_in: config.accessTokenTTL,
      state: state
    };
  }

  function * authenticate(next) {
    const Token = this.orm().Token;

    let tokenId = this.get('authorization');
    let matches = tokenId.match(/bearer\s(\S+)/i);
    if (!matches) {
      tokenId = this.query.access_token;
    } else {
      tokenId = matches[1];
    }

    this.assert(tokenId, 400, 'access_token is missing.');

    let token = yield Token.findById(tokenId);

    this.assert(token, 401, 'access_token is invalid.');

    let expiresAt = token.createdAt.getTime() + config.accessTokenTTL * 1000;
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
