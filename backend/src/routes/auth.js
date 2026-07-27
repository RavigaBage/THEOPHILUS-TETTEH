const express = require('express')
const {body,validationResult} = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const {signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken} = require('../utils/jwt');

const router = express.Router();

const loginAttempts = new Map();
const loginLocks = new Map();

const loginIpLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
    max: 50,
    message: { message: 'Too many requests from this IP' },
});
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
};

const getIP = (req) => req.ip;
const sendToken = async (res, user, statusCode = 200)=>{
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie("refreshToken", refreshToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: "none",
    });
    res.status(statusCode).json({
        status:'success',
        access:accessToken,
        user: {id:user._id, name:user.name,email:user.email, role:user.role},
    });
}

router.post('/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('A Valid email is required'),
        body('password')
        .isLength({min:8}).withMessage('Password must be at least 8 characters long')
        .matches(/\d/).withMessage('Password must contain a number'),

    ],

    async (req,res)=>{
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors: errors.array() });
        }

        const {name, email, password} = req.body;
       
        const existing = await User.findOne({email});
        if(existing){
            return res.status(409).json({message:'Email is already in use'});
        }
        const user = await User.create({name,email,password});
        await sendToken(res,user,201);
    }

)

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; 
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No access token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
}
router.post('/login',loginIpLimiter,
    [
        body('identifier').isEmail().normalizeEmail().withMessage('A Valid email is required'),
        body('password')
        .isLength({min:3}).withMessage('Password must be at least 8 characters long')
        .matches(/\d/).withMessage('Password must contain a number'),

    ],

    async (req,res)=>{
        const Email = req.body.identifier;
        const ip = getIP(req);
        const lockKey = `login:lock:${Email}`;
        const attemptKey = `login:attempts:${Email}`;

        let attemptData = loginAttempts.get(attemptKey);
        if (attemptData && attemptData.expires < Date.now()) {
            loginAttempts.delete(attemptKey);
            attemptData = null;
        }
        let attempts = attemptData ? attemptData.count : 0;

        const lockExpiry = loginLocks.get(lockKey);
        if (lockExpiry && Date.now() < lockExpiry) {
            return res.status(403).json({
                message: 'Account temporarily locked. Try again later.',
            });
        } else if (lockExpiry) {
            loginLocks.delete(lockKey); // clear expired lock
            attempts = 0;
            loginAttempts.delete(attemptKey);
        }

        // Progressive delay
        if (attempts > 0) {
            const delay = Math.min(attempts * 1000, 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const error = validationResult(req);
        if(!error.isEmpty()){
            return res.status(400).json({error: error.array() });
        }

        const {identifier, password} = req.body;
        const existing = await User.findOne({ email: identifier }).select("+password");
  
        if(!existing || !(await existing.comparePassword(password))){
            attempts++;
            loginAttempts.set(attemptKey, { count: attempts, expires: Date.now() + 15 * 60 * 1000 });

            if (attempts >= 5) {
                loginLocks.set(lockKey, Date.now() + 15 * 60 * 1000); 
            }
            return res.status(409).json({message:'Invalid Email or password'});
        }
        
        loginAttempts.delete(attemptKey);
        loginLocks.delete(lockKey);
        
        await sendToken(res,existing,201);
    }

)

router.get('/verify', requireAuth, (req, res) => {
  res.json({ status: 'success', userId: req.userId });
});


router.post('/refresh', async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token found' });

    try {
        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user || user.refreshToken !== token) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const newAccessToken = signAccessToken(user._id);
        res.status(statusCode).json({
            message:'success',
            access:newAccessToken,
        });
    } catch {
        res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    const token = req.cookies.refreshToken;
    if (token) {
        try {
            const decoded = verifyRefreshToken(token);
            const user = await User.findById(decoded.id);
            if (user) {
                user.refreshToken = undefined;
                await user.save({ validateBeforeSave: false });
            }
        } catch (err) {}
    }

    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('accessToken', cookieOptions);
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;




















