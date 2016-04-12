'use strict';

export function * authorize(next) {
  if (this.session.user) {
    // authorize
  } else {
    this.redirect(`/login?return_to=${encodeURIComponent(this.url)}`);
  }
  yield next;
}
