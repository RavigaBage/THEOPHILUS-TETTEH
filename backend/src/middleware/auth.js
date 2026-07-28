const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const AppUser = require('../models/AppUser');

// Protect staff-only routes
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No staff token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Reject app user tokens attempting to access staff routes
    if (decoded.isAppUser || decoded.role === 'app_user') {
      return res.status(403).json({ message: 'App user tokens are not allowed on staff endpoints' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Staff user does not exist' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please log in again' });
    }
    return res.status(401).json({ message: 'Invalid staff token' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes((req.user.role || '').toLowerCase())) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

// Protect app user (visitor) routes
const protectAppUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required for app users' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded.isAppUser && decoded.role !== 'app_user') {
      return res.status(403).json({ message: 'Staff tokens cannot be used as app user tokens' });
    }

    const appUser = await AppUser.findById(decoded.id);
    if (!appUser) {
      return res.status(401).json({ message: 'App user account not found' });
    }

    req.appUser = appUser;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
};

// Optional app user context
const optionalAppUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      if (decoded.isAppUser || decoded.role === 'app_user') {
        const appUser = await AppUser.findById(decoded.id);
        if (appUser) {
          req.appUser = appUser;
        }
      }
    }
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
};

module.exports = {
  protect,
  restrictTo,
  protectAppUser,
  optionalAppUser,
};
