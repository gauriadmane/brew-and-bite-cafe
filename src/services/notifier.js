const nodemailer=require('nodemailer');
function smtpReady() {return !!(process.env.SMTP_HOST&&process.env.SMTP_FROM&&process.env.SMTP_USER&&process.env.SMTP_PASS);}
async function emailOrderOtp(to,orderNumber,otp) {
  if (!smtpReady()) return false;
  const transporter=nodemailer.createTransport({
    host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||2525),
    secure:Number(process.env.SMTP_PORT)===465,
    connectionTimeout:4000,greetingTimeout:4000,socketTimeout:5000,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
  });
  try {
    await transporter.sendMail({from:process.env.SMTP_FROM,to,
      subject:`Brew & Bite collection code for ${orderNumber}`,
      text:`Your order collection code is ${otp}. It expires in 5 minutes. Do not share it until collecting your order.`});
    return true;
  } catch(err) {
    console.warn('Optional email could not be delivered:',err.code||'transport error');
    return false;
  }
}
module.exports={smtpReady,emailOrderOtp};
