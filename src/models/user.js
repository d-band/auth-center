'use strict';

import { makeSalt, encrypt } from '../util';

export default function (sequelize, DataTypes) {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      comment: 'User Email'
    },
    pass_salt: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'User Password Salt'
    },
    pass_hash: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'User Password Hash'
    },
    totp_key: {
      type: DataTypes.STRING(100),
      defaultValue: '',
      comment: 'User TOTP Key'
    },
    enable: {
      type: DataTypes.BOOLEAN(),
      defaultValue: true
    },
    is_admin: {
      type: DataTypes.BOOLEAN(),
      defaultValue: false
    }
  }, {
    tableName: 'user',
    comment: 'User Table'
  });

  User.auth = async function (email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    if (user.pass_hash !== encrypt(password, user.pass_salt)) {
      return null;
    }

    user.pass_hash = null;
    user.pass_salt = null;
    return user;
  };

  User.findByEmail = function (email) {
    const enable = 1;
    return this.findOne({
      where: { email, enable }
    });
  };

  User.add = function ({ id, password, email, totp_key, is_admin }, options) {
    const salt = makeSalt();
    const hash = encrypt(password, salt);
    return this.create({
      id,
      email,
      totp_key,
      is_admin,
      pass_salt: salt,
      pass_hash: hash
    }, options);
  };

  User.changePassword = function (id, newPwd) {
    const salt = makeSalt();
    const hash = encrypt(newPwd, salt);
    return this.update({
      pass_salt: salt,
      pass_hash: hash
    }, {
      where: { id }
    });
  };

  return User;
}
