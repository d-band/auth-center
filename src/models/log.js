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
      comment: 'request ip'
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: 'User ID'
    },
    action: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User action'
    }
  }, {
    tableName: 'log',
    comment: 'Log Tale'
  });
}
