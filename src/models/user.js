'use strict';

import { makeSalt, encrypt } from '../util';

export default function(sequelize, DataTypes) {
  return sequelize.define('User', {
    username: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      comment: 'user name'
    },
    pass_salt: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'user password salt'
    },
    pass_hash: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'user password hash'
    },
    totp_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'user totp key'
    }
  }, {
    tableName: 'user',
    comment: 'user base info',
    classMethods: {
      auth: function * (username, password) {
        let user = yield * this.findByName(username);
        if (user) {
          let hash = encrypt(password, user.pass_salt);
          if (user.pass_hash !== hash) {
            user = null;
          }
        }
        return user;
      },
      findByName: function * (username) {
        return yield this.find({
          where: {
            username: username,
            enabled: 1
          }
        });
      },
      add: function * (user) {
        let roles = user.roles || '';
        let salt = makeSalt();
        let row = this.build({
          username: user.username,
          email: user.email,
          pass_salt: salt,
          pass_hash: encrypt(user.password, salt),
          roles: roles
        });

        return yield row.save();
      },
      changepwd: function * (username, newpwd) {
        let salt = makeSalt();
        return yield this.update({
          pass_salt: salt,
          pass_hash: encrypt(newpwd, salt)
        }, {
          where: {
            username: username
          }
        });
      }
    }
  });
}
