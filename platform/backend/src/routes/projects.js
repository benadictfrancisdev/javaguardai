const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validateProject } = require('../middleware/validation');
const { Project, CodeSnippet } = require('../models');

const router = express.Router();

// GET /api/projects
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, archived = false } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: projects } = await Project.findAndCountAll({
      where: {
        user_id: req.userId,
        is_archived: archived === 'true',
      },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      projects,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// POST /api/projects
router.post('/', authenticate, validateProject, async (req, res) => {
  try {
    const { name, description } = req.body;

    const project = await Project.create({
      user_id: req.userId,
      name,
      description: description || null,
    });

    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// GET /api/projects/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [
        {
          model: CodeSnippet,
          as: 'snippets',
          order: [['created_at', 'DESC']],
          limit: 50,
        },
      ],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// PUT /api/projects/:id
router.put('/:id', authenticate, validateProject, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const { name, description } = req.body;
    await project.update({ name, description });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await project.update({ is_archived: true });
    res.json({ message: 'Project archived successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive project.' });
  }
});

module.exports = router;
