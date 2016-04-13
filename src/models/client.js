'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Client', {
    client_id: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      comment: 'Client ID'
    },
    client_secret: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Client Secret'
    },
    redirect_uri: {
      type: DataTypes.DATE,
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
