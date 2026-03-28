const User = require('./User');
const Project = require('./Project');
const CodeSnippet = require('./CodeSnippet');
const ErrorLog = require('./ErrorLog');
const AIResponse = require('./AIResponse');

// User -> Projects
User.hasMany(Project, { foreignKey: 'user_id', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> CodeSnippets
User.hasMany(CodeSnippet, { foreignKey: 'user_id', as: 'snippets' });
CodeSnippet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Project -> CodeSnippets
Project.hasMany(CodeSnippet, { foreignKey: 'project_id', as: 'snippets' });
CodeSnippet.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// CodeSnippet -> ErrorLogs
CodeSnippet.hasMany(ErrorLog, { foreignKey: 'snippet_id', as: 'errors' });
ErrorLog.belongsTo(CodeSnippet, { foreignKey: 'snippet_id', as: 'snippet' });

// User -> ErrorLogs
User.hasMany(ErrorLog, { foreignKey: 'user_id', as: 'errorLogs' });
ErrorLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// CodeSnippet -> AIResponses
CodeSnippet.hasMany(AIResponse, { foreignKey: 'snippet_id', as: 'aiResponses' });
AIResponse.belongsTo(CodeSnippet, { foreignKey: 'snippet_id', as: 'snippet' });

// User -> AIResponses
User.hasMany(AIResponse, { foreignKey: 'user_id', as: 'aiResponses' });
AIResponse.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { User, Project, CodeSnippet, ErrorLog, AIResponse };
