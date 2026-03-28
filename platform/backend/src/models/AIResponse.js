const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIResponse = sequelize.define('AIResponse', {
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
  request_type: {
    type: DataTypes.ENUM('error_explanation', 'code_fix', 'optimization', 'review', 'full_analysis'),
    allowNull: false,
  },
  prompt_sent: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  ai_response: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  model_used: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tokens_used: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  response_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  fixed_code: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  suggestions: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'ai_responses',
});

module.exports = AIResponse;
