const express = require('express');
const router = express.Router();
const AppUser = require('../models/AppUser');
const { signAccessToken } = require('../utils/jwt');
const { protectAppUser } = require('../middleware/auth');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, isAnonymous, displayName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await AppUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await AppUser.create({
      name,
      email: email.toLowerCase(),
      password,
      displayName: displayName || name,
      isAnonymous: Boolean(isAnonymous),
    });

    const token = signAccessToken({ id: user._id, role: 'app_user', isAppUser: true });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        displayName: user.getPublicName(),
        isAnonymous: user.isAnonymous,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        lastCheckinDate: user.lastCheckinDate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Signup failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await AppUser.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signAccessToken({ id: user._id, role: 'app_user', isAppUser: true });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        displayName: user.getPublicName(),
        isAnonymous: user.isAnonymous,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        lastCheckinDate: user.lastCheckinDate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

// Get current profile
router.get('/me', protectAppUser, async (req, res) => {
  const user = req.appUser;
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    displayName: user.getPublicName(),
    isAnonymous: user.isAnonymous,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastCheckinDate: user.lastCheckinDate,
  });
});

// Update profile
router.patch('/me', protectAppUser, async (req, res) => {
  try {
    const { displayName, isAnonymous, name } = req.body;
    const user = req.appUser;

    if (displayName !== undefined) user.displayName = displayName;
    if (isAnonymous !== undefined) user.isAnonymous = Boolean(isAnonymous);
    if (name !== undefined) user.name = name;

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      displayName: user.getPublicName(),
      isAnonymous: user.isAnonymous,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastCheckinDate: user.lastCheckinDate,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update profile' });
  }
});

module.exports = router;
