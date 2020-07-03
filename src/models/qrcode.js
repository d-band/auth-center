'use strict';

export default function (sequelize, DataTypes) {
  return sequelize.define('QRCode', {
    id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      allowNull: false,
      comment: 'QRCode Id'
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: 'User Id'
    }
  }, {
    tableName: 'qrcode',
    comment: 'QRCode Table'
  });
}
