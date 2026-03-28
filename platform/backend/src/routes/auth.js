const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, username, password, full_name } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const user = await User.create({
      email,
      username,
      password_hash: password,
      full_name: full_name || null,
    });

    const tokens = generateTokens(user.id);
    
    res.status(201).json({
      message: 'Registration successful',
      user: user.toSafeJSON(),
      ...tokens,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await user.update({ last_login: new Date() });
    const tokens = generateTokens(user.id);

    res.json({
      message: 'Login successful',
      user: user.toSafeJSON(),
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const tokens = generateTokens(user.id);
    res.json({ ...tokens });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, username } = req.body;
    const updates = {};

    if (full_name !== undefined) updates.full_name = full_name;
    if (username) {
      const existing = await User.findOne({ where: { username } });
      if (existing && existing.id !== req.userId) {
        return res.status(409).json({ error: 'Username already taken.' });
      }
      updates.username = username;
    }

    await req.user.update(updates);
    res.json({ user: req.user.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed.' });
  }
});

module.exports = router;
