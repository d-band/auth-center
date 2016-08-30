'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('DicRole', {
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      primaryKey: true,
      comment: 'role name'
    },
    description: {
      type: DataTypes.STRING(100),
      defaultValue: '',
      comment: 'role description'
    }
  }, {
    tableName: 'dic_role',
    comment: 'Role Dic Tale'
  });
}
