const crypto = require('crypto');
const { production } = require('../config/env');
const { AppError } = require('../utils/http');
const config={httpOnly:false,sameSite:'strict',secure:production,path:'/',maxAge:12*60*60*1000};
function issueCsrf(req,res) {
  const value=/^[a-f0-9]{64}$/.test(req.cookies?.bb_csrf||'')?req.cookies.bb_csrf:crypto.randomBytes(32).toString('hex');
  res.cookie('bb_csrf',value,config);
  res.json({ok:true,csrfToken:value});
}
function csrf(req,res,next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const header=req.get('X-CSRF-Token')||'',cookie=req.cookies.bb_csrf||'';
  if (!/^[a-f0-9]{64}$/.test(header) || !/^[a-f0-9]{64}$/.test(cookie) ||
      !crypto.timingSafeEqual(Buffer.from(header),Buffer.from(cookie))) {
    return next(new AppError(403,'Security token missing. Refresh the page.'));
  }
  const origin=req.get('origin');
  if (origin) {
    try {
      const host=req.get('x-forwarded-host')?.split(',')[0]||req.get('host');
      if (new URL(origin).host!==host) return next(new AppError(403,'Cross-origin request blocked.'));
    } catch {return next(new AppError(403,'Invalid request origin.'));}
  }
  next();
}
module.exports={issueCsrf,csrf};
