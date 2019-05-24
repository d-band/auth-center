const tokenErrors = {
  invalid_request: 400,
  invalid_client: 401,
  invalid_grant: 400,
  unauthorized_client: 401,
  unsupported_grant_type: 400,
  invalid_scope: 400,
  invalid_token: 401
};
const codeErrors = {
  invalid_redirect_uri: 400,
  unrecognized_client_id: 400,
  invalid_request: 400,
  unauthorized_client: 401,
  access_denied: 403,
  unsupported_response_type: 400,
  invalid_scope: 400
};
const reducer = obj => Object.keys(obj).reduce((prev, code) => ({
  ...prev,
  [code]: (message, props) => ({
    message: message || code,
    status: obj[code],
    props: { ...props, code }
  })
}), {});

export const TokenErrors = reducer(tokenErrors);
export const CodeErrors = reducer(codeErrors);

export function assert (ctx, value, { status, message, props }) {
  ctx.assert(value, status, message, props);
}
