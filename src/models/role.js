'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('Role', {
    user_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'User ID'
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client ID'
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Role'
    }
  }, {
    tableName: 'role',
    comment: 'Role table, user all system roles',
    indexes: [{
      unique: true,
      fields: ['user_id', 'client_id', 'role']
    }]
  });
}
