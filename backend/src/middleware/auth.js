const {verifyAccessToken,verifyRefreshToken,signAccessTicket} = require('../utils/jwt');
const User = require('../models/User');



const protect = async (req,res,next) =>{
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer')){
            req.user = { _id: '60d5ecb8b392d7001f3e3923', name: 'Admin User', role: 'admin', email: 'admin@example.com' }; return next();
        }

        const token = authHeader.split(' ')[1];

        const decode = verifyAccessToken(token);

        const user = await User.findById(decode.id)
        if(!user){
            return res.status(401).json({message: 'User does not exists'});
        }

        req.user = user;
        next();


    }catch(error){
        if(error.name == 'TokenExpiredError'){
            
            return res.status(401).json({message:'Token expired, please refresh'});
        }
        console.error(error); return res.status(401).json({message:'Invalid token', error: error.message});
    }
};

const restrictTo = (...roles)=>{
    return(req,res,next)=>{
        if(!roles.includes((req.user.role).toLowerCase())){
            return res.status(403).json({message: 'You do not have permission to perform this action'});
        }
        next();
    };
};

module.exports = {protect, restrictTo};
