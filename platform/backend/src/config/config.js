require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '8000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  ai: {
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: process.env.AI_MODEL || 'gemini-2.0-flash',
  },
  java: {
    executionTimeout: parseInt(process.env.JAVA_EXECUTION_TIMEOUT || '10000'),
    maxMemory: process.env.JAVA_MAX_MEMORY || '256m',
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600'),
  },
};
