'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Code', {
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'access code'
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'client id'
    },
    user_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'user id'
    }
  }, {
    tableName: 'code',
    comment: 'Code Tale，using when login success',
    indexes: [{
      fields: ['client_id']
    }, {
      fields: ['user_id']
    }]
  });
}
