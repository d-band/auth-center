'use strict';

import { checkURI, buildURI } from '../util';

export function * authorize() {
  const Client = this.orm().Client;
  const Code = this.orm().Code;

  let user = this.session.user;
  let clientID = this.query.client_id;
  let redirectURI = this.query.redirect_uri;

  this.assert(clientID, 400, 'client_id is missing.');

  let client = yield Client.findById(clientID);

  this.assert(client, 403, 'client_id is invalid.');

  if (redirectURI) {
    let isChecked = checkURI(client.redirect_uri, redirectURI);
    this.assert(isChecked, 400, 'redirect_uri is invalid.', {
      returnTo: client.redirect_uri
    });
  } else {
    redirectURI = client.redirect_uri;
  }

  let code = yield Code.generateCode({
    user_id: user.id,
    client_id: client.id
  });

  this.redirect(buildURI(redirectURI, {
    code: code,
    state: this.query.state
  }));
}

export function * accessToken(next) {
  yield next;
}
