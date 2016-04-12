'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Code', {
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '通过code'
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
    tableName: 'code',
    comment: 'Code表，登录验证通过',
    indexes: [{
      fields: ['client_id']
    }, {
      fields: ['user_id']
    }]
  });
}
