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

const getIP = (req) => req.ip;
const sendToken = (res, user, statusCode = 200)=>{
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);


    res.cookie('refreshToken', refreshToken,{
        httpOnly:true,
        secure:process.env.NODE_ENV == 'production',
        sameSite:'strict',
    });

    res.status(statusCode).json({
        status:'success',
        accessToken,
        user: {id:user._id, name:user.name,email:user.email, role:user.role},
    });
}

router.post('/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('A Valid email is required'),
        body('password')
        .isLength({min:8}).withMessage('Password must be at least 8 characters long')
        .matches('/\d').withMessage('Password must contain a number'),

    ],

    async (req,res)=>{
        const error = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors: errors.array() });
        }

        const {name, email, password} = req.body;
       
        const existing = await User.findOne({email});
        if(existing){
            return res.status(409).json({message:'Email is already in user'});
        }
        const user = await User.create({name,email,password});
        sendToken(res,user,201);
    }

)


router.post('/login',loginIpLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('A Valid email is required'),
        body('password')
        .isLength({min:8}).withMessage('Password must be at least 8 characters long')
        .matches(/\d/).withMessage('Password must contain a number'),

    ],

    async (req,res)=>{
        const Email = req.body.email;
        const ip = getIP(req);
       const lockKey = `login:lock:${Email}`;
        const attemptKey = `login:attempts:${Email}`;

        let attempts = loginAttempts.get(attemptKey) || 0;

        const lockExpiry = loginLocks.get(lockKey);
        if (lockExpiry && Date.now() < lockExpiry) {
            return res.status(403).json({
                message: 'Account temporarily locked. Try again later.',
            });
        } else {
            loginLocks.delete(lockKey); // clear expired lock
        }

        // Progressive delay
        if (attempts > 0) {
            const delay = Math.min(attempts * 1000, 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        if (attempts > 0) {
            const delay = Math.min(attempts * 1000, 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        
        const error = validationResult(req);
        if(!error.isEmpty()){
            return res.status(400).json({error: error.array() });
        }


        const {email, password} = req.body;
        const existing = await User.findOne({email}).select('+password');
        if(!existing || !(await existing.comparePassword(password))){
            attempts++;
            await redis.set(attemptKey, attempts, 'EX', 900); 

            if (attempts >= 5) {
                await redis.set(lockKey, 1, 'EX', 900); 
            }
            return res.status(409).json({message:'Invalid Email or password'});
        }
        sendToken(res,existing,201);
    }

)

router.post('/refresh', async(req, res)=>{
    const token = req.cookies.refreshToken;
    if(!token) return res.status(401).json({message:'No refresh Token found'});
    try{
        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id);
        if(!user) return res.status(401).json({message:'User not found'});

        const newAccessToken = signAccessToken(user._id);
        res.json({accessToken: newAccessToken});
    }catch{
        res.status(401).json({message: 'Invalid or expired refresh token'});
    }
});


router.post('/logout', async(req, res)=>{
    res.clearCookie('refreshToken',
        {
            httpOnly:true,
            sameSite:'strict'
        }
    );
    res.json({message: 'Logged out successfully '});
});

module.exports = router;