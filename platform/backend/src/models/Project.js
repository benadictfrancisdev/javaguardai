const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { len: [1, 100] },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  language: {
    type: DataTypes.STRING(20),
    defaultValue: 'java',
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  snippet_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  error_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'projects',
});

module.exports = Project;
