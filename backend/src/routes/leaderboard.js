const express = require('express');
const router = express.Router();
const AppUser = require('../models/AppUser');
const { protectAppUser, optionalAppUser } = require('../middleware/auth');

// Leaderboard Top N
router.get('/leaderboard', optionalAppUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const users = await AppUser.find()
      .sort({ currentStreak: -1, longestStreak: -1 })
      .limit(limit);

    const currentUserId = req.appUser ? req.appUser._id.toString() : null;

    const formatted = users.map((u, index) => {
      const isMe = currentUserId && u._id.toString() === currentUserId;
      return {
        rank: index + 1,
        id: u._id,
        name: u.getPublicName(),
        streak: u.currentStreak,
        longestStreak: u.longestStreak,
        me: isMe,
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch leaderboard' });
  }
});

// Current user streak & milestones
router.get('/users/me/streak', protectAppUser, async (req, res) => {
  try {
    const user = req.appUser;
    const current = user.currentStreak || 0;
    const longest = user.longestStreak || 0;

    res.json({
      currentStreak: current,
      longestStreak: longest,
      lastCheckinDate: user.lastCheckinDate,
      milestones: {
        spark: current >= 7,
        ember: current >= 14,
        flame: current >= 30,
        legend: current >= 100,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch streak details' });
  }
});

module.exports = router;
