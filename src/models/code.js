'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('Code', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'access code'
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'client id'
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: 'User ID'
    },
    redirect_uri: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Redirect Uri'
    }
  }, {
    tableName: 'code',
    comment: 'Code Tale，using when login success',
    indexes: [{
      fields: ['client_id']
    }]
  });
}
