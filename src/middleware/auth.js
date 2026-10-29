const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('../utils/http');
const { production } = require('../config/env');
function setAuthCookie(res, user) {
  const token=jwt.sign({sub:String(user._id)},process.env.JWT_SECRET,{expiresIn:'12h'});
  res.cookie('bb_auth',token,{httpOnly:true,secure:production,sameSite:'lax',path:'/',maxAge:12*60*60*1000});
}
function clearAuthCookie(res) {res.clearCookie('bb_auth',{path:'/',sameSite:'lax',secure:production});}
async function requireUser(req,res,next) {
  try {
    const token=req.cookies.bb_auth;
    if (!token) throw new AppError(401,'Please log in.');
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    const user=await User.findById(payload.sub);
    if (!user || !user.active || (user.role==='staff' && user.approval!=='approved'))
      throw new AppError(403,'Your account is unavailable or awaiting approval.');
    req.user=user; next();
  } catch(err) {next(err.name==='JsonWebTokenError'||err.name==='TokenExpiredError'?new AppError(401,'Session expired. Log in again.'):err);}
}
const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.user?.role)?next():next(new AppError(403,'Insufficient permissions.'));
module.exports={setAuthCookie,clearAuthCookie,requireUser,roles};
