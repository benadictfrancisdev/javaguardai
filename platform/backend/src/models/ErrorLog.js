const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ErrorLog = sequelize.define('ErrorLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  snippet_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'code_snippets', key: 'id' },
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  error_type: {
    type: DataTypes.ENUM('compilation', 'runtime', 'logical', 'security', 'performance'),
    allowNull: false,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  error_line: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  error_column: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  severity: {
    type: DataTypes.ENUM('error', 'warning', 'info'),
    defaultValue: 'error',
  },
  is_resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'error_logs',
});

module.exports = ErrorLog;
