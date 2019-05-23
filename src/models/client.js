'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('Client', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Client Id'
    },
    secret: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client Secret'
    },
    redirect_uri: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Redirect URI'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client Name'
    },
    name_cn: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      comment: 'Client Name CN'
    }
  }, {
    tableName: 'client',
    comment: 'Client Table'
  });
}
