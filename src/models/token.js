'use strict';

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Token', {
    access_token: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '通过Token'
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '客户端id'
    },
    user_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '用户id'
    }
  }, {
    tableName: 'token',
    comment: 'Token表，验证身份通过',
    indexes: [{
      fields: ['client_id']
    }, {
      fields: ['user_id']
    }]
  });
};