const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'iac_super_secret_jwt_key_2026';

const signAccessToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
