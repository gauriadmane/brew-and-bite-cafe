const express=require('express');
const path=require('path');
const helmet=require('helmet');
const cookieParser=require('cookie-parser');
const {csrf}=require('./middleware/csrf');
const {errorHandler,notFound}=require('./middleware/errors');
const {webhook,paymentRouter}=(()=>{const p=require('./routes/payments');return {webhook:p.webhook,paymentRouter:p.router};})();
const app=express();
app.disable('x-powered-by');
app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{
  defaultSrc:["'self'"],scriptSrc:["'self'",'https://checkout.razorpay.com'],
  imgSrc:["'self'",'data:','https://cdn.razorpay.com'],
  connectSrc:["'self'",'https://api.razorpay.com','https://checkout.razorpay.com'],
  frameSrc:["'self'",'https://api.razorpay.com','https://checkout.razorpay.com','https://*.razorpay.com'],
  styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com'],objectSrc:["'none'"]
}}}));
app.post('/api/payments/webhook',express.raw({type:'application/json',limit:'100kb'}),webhook);
// Uploads are binary JPEG requests (never multipart or base64 JSON). Limit this route only.
app.use('/api/owner/menu/:id/image',express.raw({type:'image/jpeg',limit:'350kb'}));
app.use(express.json({limit:'100kb'}));
app.use(cookieParser());
app.get('/api/health',(req,res)=>res.json({ok:true,service:'brew-and-bite',status:'up'}));
app.use('/api',csrf);
app.use('/api/auth',require('./routes/auth'));
app.use('/api',require('./routes/catalog'));
app.use('/api/orders',require('./routes/orders'));
app.use('/api/owner',require('./routes/owner'));
app.use('/api/owner',require('./routes/customer-management'));
app.use('/api/kitchen',require('./routes/kitchen'));
app.use('/api/payments',paymentRouter);
app.use('/api/owner/reports',require('./routes/reports'));
app.use('/api',notFound);
app.use(express.static(path.join(__dirname,'../public'),{extensions:['html'],maxAge:0}));
app.use((req,res)=>res.status(404).sendFile(path.join(__dirname,'../public/404.html')));
app.use(errorHandler);
module.exports=app;
