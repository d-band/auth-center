'use strict';

import { makeSalt, encrypt } from '../util';

export default function (sequelize, DataTypes) {
  return sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
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
      auth: function * (email, password) {
        let user = yield this.findByEmail(email);
        if (!user) return null;
        if (user.pass_hash !== encrypt(password, user.pass_salt)) {
          return null;
        }

        user.pass_hash = null;
        user.pass_salt = null;
        return user;
      },
      findByEmail: function * (email) {
        const enable = 1;
        return yield this.find({
          where: { email, enable }
        });
      },
      add: function * ({ id, password, email, totp_key, is_admin }, options) {
        const salt = makeSalt();
        const hash = encrypt(password, salt);
        return yield this.create({
          id,
          email,
          totp_key,
          is_admin,
          pass_salt: salt,
          pass_hash: hash
        }, options);
      },
      changePassword: function * (id, newPwd) {
        const salt = makeSalt();
        const hash = encrypt(newPwd, salt);
        return yield this.update({
          pass_salt: salt,
          pass_hash: hash
        }, {
          where: { id }
        });
      }
    }
  });
}
