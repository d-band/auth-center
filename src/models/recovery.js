'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('Recovery', {
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: 'User Id'
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Recovery Token'
    }
  }, {
    tableName: 'recovery',
    comment: 'Account Recovery Table',
    indexes: [{
      fields: ['user_id']
    }]
  });
}
