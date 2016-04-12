'use strict';

var crypto = require('crypto');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('User', {
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
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
    indexes: [{
      unique: true,
      fields: ['username']
    }],
    classMethods: {
      // utils
      makeSalt: function() {
        return Math.round((new Date().valueOf() * Math.random())) + '';
      },
      encrypt: function(pass, salt) {
        if (!pass) return '';
        return crypto.createHmac('sha1', salt).update(pass).digest('hex');
      },
      // read
      auth: function*(username, password) {
        var user = yield * this.findByName(username);
        if (user) {
          var hash = this.encrypt(password, user.pass_salt);
          if (user.pass_hash !== hash) {
            user = null;
          }
        }
        return user;
      },
      findByName: function*(username) {
        return yield this.find({
          where: {
            username: username,
            enabled: 1
          }
        });
      },
      search: function*(query, options) {
        return yield this.findAll({
          attributes: ['id', 'username'],
          where: {
            username: {
              like: '%' + query + '%'
            }
          },
          limit: options.limit
        });
      },
      add: function*(user) {
        var roles = user.roles || '';

        var salt = this.makeSalt();
        var row = this.build({
          username: user.username,
          email: user.email,
          pass_salt: salt,
          pass_hash: this.encrypt(user.password, salt),
          roles: roles
        });

        return yield row.save();
      },
      changepwd: function*(username, newpwd) {
        var salt = this.makeSalt();
        return yield this.update({
          pass_salt: salt,
          pass_hash: this.encrypt(newpwd, salt)
        }, {
          where: {
            username: username
          }
        });
      }
    }
  });
};