const express=require('express');
const bcrypt=require('bcryptjs');
const {rateLimit}=require('express-rate-limit');
const {User}=require('../models');
const {parse,register,login,profile}=require('../utils/validation');
const {asyncRoute,ensure}=require('../utils/http');
const {setAuthCookie,clearAuthCookie,requireUser}=require('../middleware/auth');
const {issueCsrf}=require('../middleware/csrf');
const router=express.Router();
const limit=rateLimit({windowMs:15*60*1000,limit:15,standardHeaders:'draft-7',legacyHeaders:false,
  message:{ok:false,error:'Too many attempts. Please try again later.'}});
const serialize=u=>({id:String(u._id),name:u.name,email:u.email,phone:u.phone,role:u.role,approval:u.approval});
router.get('/csrf',issueCsrf);
router.post('/register',limit,asyncRoute(async(req,res)=>{
  const data=parse(register,req.body);
  ensure(!await User.exists({email:data.email}),409,'An account with this email already exists.');
  const user=await User.create({...data,passwordHash:await bcrypt.hash(data.password,12),password:undefined,role:'customer'});
  setAuthCookie(res,user);res.status(201).json({ok:true,user:serialize(user)});
}));
router.post('/staff/request',limit,asyncRoute(async(req,res)=>{
  const data=parse(register,req.body);
  ensure(!await User.exists({email:data.email}),409,'An account with this email already exists.');
  await User.create({...data,passwordHash:await bcrypt.hash(data.password,12),password:undefined,role:'staff',approval:'pending'});
  res.status(201).json({ok:true,message:'Request submitted. Log in after approval.'});
}));
router.post('/login',limit,asyncRoute(async(req,res)=>{
  const data=parse(login,req.body);
  const user=await User.findOne({email:data.email}).select('+passwordHash');
  const match=user?await bcrypt.compare(data.password,user.passwordHash):false;
  ensure(user&&match,401,'Incorrect email or password.');
  ensure(user.active,403,'Account is disabled.');
  ensure(user.role!=='staff'||user.approval==='approved',403,'Staff account is pending approval or rejected.');
  setAuthCookie(res,user);res.json({ok:true,user:serialize(user)});
}));
router.post('/logout',(req,res)=>{clearAuthCookie(res);res.json({ok:true});});
router.get('/me',requireUser,(req,res)=>res.json({ok:true,user:serialize(req.user)}));
router.patch('/me',requireUser,asyncRoute(async(req,res)=>{
  const data=parse(profile,req.body);
  const user=await User.findByIdAndUpdate(req.user._id,{$set:data},{new:true,runValidators:true});
  res.json({ok:true,user:serialize(user)});
}));
module.exports=router;
