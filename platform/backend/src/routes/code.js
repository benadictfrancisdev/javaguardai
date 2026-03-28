const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { validateCodeSubmission, sanitizeJavaCode } = require('../middleware/validation');
const { CodeSnippet, ErrorLog, AIResponse, Project, User } = require('../models');
const javaExecutor = require('../services/javaExecutor');
const aiService = require('../services/aiService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 50 * 1024 }, // 50KB max
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.java')) {
      cb(null, true);
    } else {
      cb(new Error('Only .java files are allowed'));
    }
  },
});

// POST /api/code/submit - Submit code for analysis
router.post('/submit', authenticate, validateCodeSubmission, sanitizeJavaCode, async (req, res) => {
  try {
    const { source_code, title, project_id } = req.body;

    // Create code snippet record
    const snippet = await CodeSnippet.create({
      user_id: req.userId,
      project_id: project_id || null,
      title: title || 'Untitled',
      source_code,
      status: 'compiling',
    });

    // Execute Java code
    const executionResult = await javaExecutor.execute(source_code);

    // Update snippet with execution results
    await snippet.update({
      status: executionResult.status,
      compilation_output: executionResult.compilationOutput,
      execution_output: executionResult.executionOutput,
      execution_time_ms: executionResult.executionTimeMs,
      has_errors: executionResult.errors.length > 0,
    });

    // Store error logs
    const errorLogs = [];
    for (const error of executionResult.errors) {
      const log = await ErrorLog.create({
        snippet_id: snippet.id,
        user_id: req.userId,
        error_type: error.type || 'compilation',
        error_message: error.message,
        error_line: error.line || null,
        error_column: error.column || null,
        severity: error.severity || 'error',
      });
      errorLogs.push(log);
    }

    // Run AI analysis
    let aiAnalysis = null;
    try {
      aiAnalysis = await aiService.analyzeCode(
        source_code,
        executionResult.compilationOutput,
        executionResult.executionOutput,
        executionResult.errors
      );

      // Store AI response
      await AIResponse.create({
        snippet_id: snippet.id,
        user_id: req.userId,
        request_type: 'full_analysis',
        prompt_sent: `Analyze code: ${title || 'Untitled'}`,
        ai_response: aiAnalysis.rawResponse || JSON.stringify(aiAnalysis),
        model_used: aiAnalysis.modelUsed,
        tokens_used: aiAnalysis.tokensUsed,
        response_time_ms: aiAnalysis.responseTimeMs,
        fixed_code: aiAnalysis.fixedCode || null,
        explanation: aiAnalysis.explanation || null,
        suggestions: aiAnalysis.suggestions || null,
      });
    } catch (aiError) {
      console.error('AI analysis error:', aiError.message);
    }

    // Update project snippet count if applicable
    if (project_id) {
      await Project.increment('snippet_count', { where: { id: project_id } });
      if (executionResult.errors.length > 0) {
        await Project.increment('error_count', { where: { id: project_id } });
      }
    }

    // Update user stats
    await User.increment('total_analyses', { where: { id: req.userId } });

    // Add warnings from sanitization
    const warnings = req.codeWarnings || [];

    res.json({
      snippet: snippet.toJSON(),
      execution: {
        status: executionResult.status,
        compilationOutput: executionResult.compilationOutput,
        executionOutput: executionResult.executionOutput,
        executionTimeMs: executionResult.executionTimeMs,
      },
      errors: errorLogs,
      aiAnalysis: aiAnalysis ? {
        summary: aiAnalysis.summary,
        errors: aiAnalysis.errors,
        fixedCode: aiAnalysis.fixedCode,
        explanation: aiAnalysis.explanation,
        suggestions: aiAnalysis.suggestions,
        codeQuality: aiAnalysis.codeQuality,
        fromCache: aiAnalysis.fromCache,
        responseTimeMs: aiAnalysis.responseTimeMs,
      } : null,
      warnings,
    });
  } catch (error) {
    console.error('Code submission error:', error);
    res.status(500).json({ error: 'Code submission failed.' });
  }
});

// POST /api/code/upload - Upload .java file
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const source_code = req.file.buffer.toString('utf8');
    const title = req.file.originalname.replace('.java', '');

    // Forward to submit logic
    req.body = { source_code, title, project_id: req.body.project_id };
    
    const snippet = await CodeSnippet.create({
      user_id: req.userId,
      project_id: req.body.project_id || null,
      title,
      source_code,
      file_name: req.file.originalname,
      status: 'compiling',
    });

    const executionResult = await javaExecutor.execute(source_code);

    await snippet.update({
      status: executionResult.status,
      compilation_output: executionResult.compilationOutput,
      execution_output: executionResult.executionOutput,
      execution_time_ms: executionResult.executionTimeMs,
      has_errors: executionResult.errors.length > 0,
    });

    const errorLogs = [];
    for (const error of executionResult.errors) {
      const log = await ErrorLog.create({
        snippet_id: snippet.id,
        user_id: req.userId,
        error_type: error.type || 'compilation',
        error_message: error.message,
        error_line: error.line || null,
        severity: error.severity || 'error',
      });
      errorLogs.push(log);
    }

    let aiAnalysis = null;
    try {
      aiAnalysis = await aiService.analyzeCode(
        source_code,
        executionResult.compilationOutput,
        executionResult.executionOutput,
        executionResult.errors
      );

      await AIResponse.create({
        snippet_id: snippet.id,
        user_id: req.userId,
        request_type: 'full_analysis',
        prompt_sent: `Analyze uploaded file: ${req.file.originalname}`,
        ai_response: aiAnalysis.rawResponse || JSON.stringify(aiAnalysis),
        model_used: aiAnalysis.modelUsed,
        tokens_used: aiAnalysis.tokensUsed,
        response_time_ms: aiAnalysis.responseTimeMs,
        fixed_code: aiAnalysis.fixedCode || null,
        explanation: aiAnalysis.explanation || null,
        suggestions: aiAnalysis.suggestions || null,
      });
    } catch (aiError) {
      console.error('AI analysis error:', aiError.message);
    }

    await User.increment('total_analyses', { where: { id: req.userId } });

    res.json({
      snippet: snippet.toJSON(),
      execution: {
        status: executionResult.status,
        compilationOutput: executionResult.compilationOutput,
        executionOutput: executionResult.executionOutput,
        executionTimeMs: executionResult.executionTimeMs,
      },
      errors: errorLogs,
      aiAnalysis: aiAnalysis ? {
        summary: aiAnalysis.summary,
        errors: aiAnalysis.errors,
        fixedCode: aiAnalysis.fixedCode,
        explanation: aiAnalysis.explanation,
        suggestions: aiAnalysis.suggestions,
        codeQuality: aiAnalysis.codeQuality,
        fromCache: aiAnalysis.fromCache,
      } : null,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed.' });
  }
});

// POST /api/code/:id/fix - Get AI fix for a snippet
router.post('/:id/fix', authenticate, async (req, res) => {
  try {
    const snippet = await CodeSnippet.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [{ model: ErrorLog, as: 'errors' }],
    });

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found.' });
    }

    const errors = snippet.errors.map(e => ({
      type: e.error_type,
      message: e.error_message,
      line: e.error_line,
    }));

    const fixResult = await aiService.getCodeFix(snippet.source_code, errors);

    await AIResponse.create({
      snippet_id: snippet.id,
      user_id: req.userId,
      request_type: 'code_fix',
      prompt_sent: `Fix code for snippet: ${snippet.title}`,
      ai_response: JSON.stringify(fixResult),
      model_used: fixResult.modelUsed,
      tokens_used: fixResult.tokensUsed,
      response_time_ms: fixResult.responseTimeMs,
      fixed_code: fixResult.fixedCode || null,
      explanation: fixResult.explanation || null,
    });

    res.json({
      fixedCode: fixResult.fixedCode,
      changes: fixResult.changes,
      explanation: fixResult.explanation,
      responseTimeMs: fixResult.responseTimeMs,
      fromCache: fixResult.fromCache,
    });
  } catch (error) {
    console.error('Fix error:', error);
    res.status(500).json({ error: 'Failed to generate fix.' });
  }
});

// POST /api/code/:id/optimize - Optimize code
router.post('/:id/optimize', authenticate, async (req, res) => {
  try {
    const snippet = await CodeSnippet.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found.' });
    }

    const optimizeResult = await aiService.optimizeCode(snippet.source_code);

    await AIResponse.create({
      snippet_id: snippet.id,
      user_id: req.userId,
      request_type: 'optimization',
      prompt_sent: `Optimize code for snippet: ${snippet.title}`,
      ai_response: JSON.stringify(optimizeResult),
      model_used: optimizeResult.modelUsed,
      tokens_used: optimizeResult.tokensUsed,
      response_time_ms: optimizeResult.responseTimeMs,
      fixed_code: optimizeResult.optimizedCode || null,
      explanation: optimizeResult.explanation || null,
    });

    res.json({
      optimizedCode: optimizeResult.optimizedCode,
      changes: optimizeResult.changes,
      performanceImpact: optimizeResult.performanceImpact,
      explanation: optimizeResult.explanation,
    });
  } catch (error) {
    console.error('Optimize error:', error);
    res.status(500).json({ error: 'Failed to optimize code.' });
  }
});

// GET /api/code/snippets - Get user's code snippets
router.get('/snippets', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, project_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = { user_id: req.userId };

    if (status) where.status = status;
    if (project_id) where.project_id = project_id;

    const { count, rows: snippets } = await CodeSnippet.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        { model: ErrorLog, as: 'errors', attributes: ['id', 'error_type', 'error_message', 'severity'] },
      ],
    });

    res.json({
      snippets,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch snippets.' });
  }
});

// GET /api/code/snippets/:id - Get a single snippet with full details
router.get('/snippets/:id', authenticate, async (req, res) => {
  try {
    const snippet = await CodeSnippet.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [
        { model: ErrorLog, as: 'errors' },
        { model: AIResponse, as: 'aiResponses', order: [['created_at', 'DESC']] },
      ],
    });

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found.' });
    }

    res.json({ snippet });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch snippet.' });
  }
});

// POST /api/code/:id/apply-fix - Apply an AI fix
router.post('/:id/apply-fix', authenticate, async (req, res) => {
  try {
    const { fixedCode } = req.body;
    if (!fixedCode) {
      return res.status(400).json({ error: 'Fixed code is required.' });
    }

    const snippet = await CodeSnippet.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found.' });
    }

    // Create a new snippet with the fixed code
    const fixedSnippet = await CodeSnippet.create({
      user_id: req.userId,
      project_id: snippet.project_id,
      title: `${snippet.title} (Fixed)`,
      source_code: fixedCode,
      status: 'compiling',
    });

    // Execute the fixed code
    const executionResult = await javaExecutor.execute(fixedCode);

    await fixedSnippet.update({
      status: executionResult.status,
      compilation_output: executionResult.compilationOutput,
      execution_output: executionResult.executionOutput,
      execution_time_ms: executionResult.executionTimeMs,
      has_errors: executionResult.errors.length > 0,
    });

    // Mark original errors as resolved if fix is successful
    if (executionResult.status === 'success') {
      await ErrorLog.update(
        { is_resolved: true },
        { where: { snippet_id: snippet.id } }
      );
      await User.increment('total_fixes_applied', { where: { id: req.userId } });
    }

    res.json({
      snippet: fixedSnippet.toJSON(),
      execution: {
        status: executionResult.status,
        compilationOutput: executionResult.compilationOutput,
        executionOutput: executionResult.executionOutput,
        executionTimeMs: executionResult.executionTimeMs,
      },
      errors: executionResult.errors,
    });
  } catch (error) {
    console.error('Apply fix error:', error);
    res.status(500).json({ error: 'Failed to apply fix.' });
  }
});

module.exports = router;
