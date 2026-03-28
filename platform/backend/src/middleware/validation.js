const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('username').isLength({ min: 3, max: 50 }).trim().withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('full_name').optional().isLength({ max: 100 }).trim(),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors,
];

const validateCodeSubmission = [
  body('source_code').notEmpty().isLength({ max: 50000 }).withMessage('Source code required (max 50KB)'),
  body('title').optional().isLength({ max: 200 }).trim(),
  body('project_id').optional().isUUID(),
  handleValidationErrors,
];

const validateProject = [
  body('name').notEmpty().isLength({ min: 1, max: 100 }).trim().withMessage('Project name required'),
  body('description').optional().isLength({ max: 1000 }).trim(),
  handleValidationErrors,
];

// Sanitize Java code to prevent dangerous operations
const sanitizeJavaCode = (req, res, next) => {
  const code = req.body.source_code;
  if (!code) return next();

  const dangerousPatterns = [
    /Runtime\s*\.\s*getRuntime\s*\(\s*\)\s*\.\s*exec/i,
    /ProcessBuilder/i,
    /System\s*\.\s*exit/i,
    /java\.io\.File(?!NotFoundException)/i,
    /java\.net\.(Socket|ServerSocket|URL|HttpURLConnection)/i,
    /java\.lang\.reflect/i,
    /ClassLoader/i,
    /SecurityManager/i,
    /System\s*\.\s*setProperty/i,
    /Thread\s*\.\s*sleep\s*\(\s*\d{5,}/i,
  ];

  const warnings = [];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      warnings.push(`Potentially unsafe pattern detected: ${pattern.source}`);
    }
  }

  if (warnings.length > 0) {
    req.codeWarnings = warnings;
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateCodeSubmission,
  validateProject,
  sanitizeJavaCode,
  handleValidationErrors,
};
