'use strict';

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
  yield this.render('admin/users', {
    users: 'active'
  });
}

export function * clientList() {
  // const CLIENT = this.orm().Client;
  yield this.render('admin/clients', {
    clients: 'active'
  });
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
