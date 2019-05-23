'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('DicRole', {
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      primaryKey: true,
      comment: 'Role Name'
    },
    description: {
      type: DataTypes.STRING(100),
      defaultValue: '',
      comment: 'Role Description'
    }
  }, {
    tableName: 'dic_role',
    comment: 'Role Dic Table'
  });
}
