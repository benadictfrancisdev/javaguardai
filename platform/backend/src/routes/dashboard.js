const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { User, Project, CodeSnippet, ErrorLog, AIResponse } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// GET /api/dashboard/stats - Get user's dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const [
      totalSnippets,
      totalErrors,
      resolvedErrors,
      totalProjects,
      totalAIResponses,
      recentSnippets,
    ] = await Promise.all([
      CodeSnippet.count({ where: { user_id: userId } }),
      ErrorLog.count({ where: { user_id: userId } }),
      ErrorLog.count({ where: { user_id: userId, is_resolved: true } }),
      Project.count({ where: { user_id: userId, is_archived: false } }),
      AIResponse.count({ where: { user_id: userId } }),
      CodeSnippet.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: 5,
        attributes: ['id', 'title', 'status', 'has_errors', 'execution_time_ms', 'created_at'],
      }),
    ]);

    // Error type distribution
    const errorDistribution = await ErrorLog.findAll({
      where: { user_id: userId },
      attributes: [
        'error_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['error_type'],
      raw: true,
    });

    // Status distribution
    const statusDistribution = await CodeSnippet.findAll({
      where: { user_id: userId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // Activity over last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyActivity = await CodeSnippet.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: sevenDaysAgo },
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    const user = await User.findByPk(userId, {
      attributes: ['total_analyses', 'total_fixes_applied'],
    });

    res.json({
      overview: {
        totalSnippets,
        totalErrors,
        resolvedErrors,
        unresolvedErrors: totalErrors - resolvedErrors,
        totalProjects,
        totalAIResponses,
        totalAnalyses: user.total_analyses,
        totalFixesApplied: user.total_fixes_applied,
        errorResolutionRate: totalErrors > 0 ? Math.round((resolvedErrors / totalErrors) * 100) : 0,
      },
      errorDistribution,
      statusDistribution,
      dailyActivity,
      recentSnippets,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

// GET /api/dashboard/recent-errors - Get recent errors
router.get('/recent-errors', authenticate, async (req, res) => {
  try {
    const errors = await ErrorLog.findAll({
      where: { user_id: req.userId },
      order: [['created_at', 'DESC']],
      limit: 20,
      include: [
        {
          model: CodeSnippet,
          as: 'snippet',
          attributes: ['id', 'title', 'status'],
        },
      ],
    });

    res.json({ errors });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent errors.' });
  }
});

// GET /api/dashboard/ai-history - Get AI analysis history
router.get('/ai-history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: responses } = await AIResponse.findAndCountAll({
      where: { user_id: req.userId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: CodeSnippet,
          as: 'snippet',
          attributes: ['id', 'title', 'status'],
        },
      ],
      attributes: ['id', 'request_type', 'model_used', 'tokens_used', 'response_time_ms', 'rating', 'created_at'],
    });

    res.json({
      responses,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI history.' });
  }
});

module.exports = router;
