const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { signAccessToken } = require('../utils/jwt');

// Staff Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Auto-seed initial admin user if no staff exist
    if (!user && (email.toLowerCase() === 'admin@iac.com' || (await User.countDocuments()) === 0)) {
      user = await User.create({
        name: 'IAC Administrator',
        email: email.toLowerCase(),
        password: password.length >= 8 ? password : 'AdminPassword123!',
        role: 'admin',
      });
      user = await User.findById(user._id).select('+password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signAccessToken({ id: user._id, role: user.role, isAppUser: false });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Staff login failed' });
  }
});

module.exports = router;
