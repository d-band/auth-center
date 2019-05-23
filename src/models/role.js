'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('Role', {
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: 'User Id'
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client Id'
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Role'
    }
  }, {
    tableName: 'role',
    comment: 'Role Table, user roles of the clients',
    indexes: [{
      unique: true,
      fields: ['user_id', 'client_id', 'role']
    }]
  });
}
