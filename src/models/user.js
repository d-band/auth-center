'use strict';

import { makeSalt, encrypt } from '../util';

export default function(sequelize, DataTypes) {
  return sequelize.define('User', {
    username: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      comment: 'user name'
    },
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      comment: 'user email'
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
      defaultValue: '',
      comment: 'user totp key'
    },
    enable: {
      type: DataTypes.BOOLEAN(),
      defaultValue: 1,
      comment: '有效性，1有效，0无效'
    },
    is_admin: {
      type: DataTypes.BOOLEAN(),
      defaultValue: 0,
      comment: '是否是管理员，1是2不是'
    }
  }, {
    tableName: 'user',
    comment: 'user base info',
    classMethods: {
      auth: function * (username, password) {
        let user = yield this.findById(username);

        if (!user) {
          user = yield this.findByEmail(username);
        }

        if (!user) return null;

        if (user.pass_hash !== encrypt(password, user.pass_salt)) {
          return null;
        }

        user.pass_hash = null;
        user.pass_salt = null;
        return user;
      },
      findByEmail: function * (email) {
        return yield this.find({
          where: {
            email: email
          }
        });
      },
      add: function * (user) {
        let salt = makeSalt();
        return yield this.create({
          username: user.username,
          email: user.email,
          pass_salt: salt,
          pass_hash: encrypt(user.password, salt),
          totp_key: user.totp_key
        });
      },
      changePassword: function * (username, newPassword) {
        let salt = makeSalt();
        return yield this.update({
          pass_salt: salt,
          pass_hash: encrypt(newPassword, salt)
        }, {
          where: {
            username: username
          }
        });
      }
    }
  });
}
