'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Client', {
    client_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
    }
  }, {
    tableName: 'client',
    comment: 'Client Table',
    indexes: [{
      unique: true,
      fields: ['client_id']
    }]
  });
}
