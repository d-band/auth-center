'use strict';

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Client', {
    client_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '客户端id'
    },
    client_secret: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '客户端密钥'
    },
    redirect_uri: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '跳转链接'
    }
  }, {
    tableName: 'client',
    comment: 'Client表，存储分类的id和密钥',
    indexes:[{
      unique: true,
      fields: ['client_id']
    }]
  });
};