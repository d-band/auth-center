'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('Log', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    ip: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Request IP'
    },
    user: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'User login account'
    },
    action: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User Action'
    }
  }, {
    tableName: 'log',
    comment: 'Log Table'
  });
}
