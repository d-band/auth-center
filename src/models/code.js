'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('Code', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Authorization Code'
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client Id'
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: 'User Id'
    },
    redirect_uri: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Redirect URI'
    }
  }, {
    tableName: 'code',
    comment: 'Authorization Code Table',
    indexes: [{
      fields: ['client_id']
    }]
  });
}
