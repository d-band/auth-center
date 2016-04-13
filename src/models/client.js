'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Client', {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      comment: 'Client ID'
    },
    secret: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client Secret'
    },
    redirect_uri: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Redirect Uri'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client Name'
    }
  }, {
    tableName: 'client',
    comment: 'Client Table'
  });
}
