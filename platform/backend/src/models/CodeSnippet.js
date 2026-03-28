const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CodeSnippet = sequelize.define('CodeSnippet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  project_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'projects', key: 'id' },
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: 'Untitled',
  },
  source_code: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  language: {
    type: DataTypes.STRING(20),
    defaultValue: 'java',
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'compiling', 'running', 'success', 'compilation_error', 'runtime_error', 'timeout', 'analyzed'),
    defaultValue: 'pending',
  },
  compilation_output: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  execution_output: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  execution_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  has_errors: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'code_snippets',
});

module.exports = CodeSnippet;
