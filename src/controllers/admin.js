'use strict';

export function * home() {
  // let user = this.req.user.username;
  yield this.render('home');
}

export function * userList() {
  // const USER = this.orm().User;
  // let users = yield USER.findAll({
  //   attributes: ['username', 'email'],
  //   where: {
  //     enable: 1
  //   },
  //   offset: +cond.offset,
  //   limit: +cond.limit,
  //   order: [
  //     ['username', 'ASC']
  //   ]
  // });
  yield this.render('users');
}

export function * clientList() {
  // const CLIENT = this.orm().Client;
  yield this.render('clients');
}

export function * getUsers() {
  // const USER = this.orm().User;
  // let users = yield USER.findAll({
  //   attributes: ['username', 'email'],
  //   where: {
  //     enable: 1
  //   },
  //   offset: +cond.offset,
  //   limit: +cond.limit,
  //   order: [
  //     ['username', 'ASC']
  //   ]
  // });
}

export function * getClients() {
  // const USER = this.orm().User;
  // let users = yield USER.findAll({
  //   attributes: ['username', 'email'],
  //   where: {
  //     enable: 1
  //   },
  //   offset: +cond.offset,
  //   limit: +cond.limit,
  //   order: [
  //     ['username', 'ASC']
  //   ]
  // });
}
