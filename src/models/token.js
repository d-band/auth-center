'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('Token', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Access Token'
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
    ttl: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'Time To Live (Second)'
    },
    refresh_token: {
      type: DataTypes.STRING(40),
      unique: true,
      allowNull: false,
      comment: 'Refresh Token'
    }
  }, {
    tableName: 'token',
    comment: 'Access Token Table'
  });
}
