'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('EmailCode', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'email code'
    },
    user_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'user id'
    }
  }, {
    tableName: 'email_code',
    comment: 'EmailCode Tale，using when password reset',
    indexes: [{
      fields: ['user_id']
    }]
  });
}
