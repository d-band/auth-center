'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('EmailCode', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Email Code'
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: 'User Id'
    }
  }, {
    tableName: 'email_code',
    comment: 'Email Code Tale for password reset',
    indexes: [{
      fields: ['user_id']
    }]
  });
}
