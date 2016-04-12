'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Token', {
    access_token: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Access Token'
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client ID'
    },
    user_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'User ID'
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
}
