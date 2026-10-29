const crypto=require('node:crypto');
function checkSignature(providerOrderId,paymentId,signature,secret) {
  if (![providerOrderId,paymentId,signature,secret].every(x=>typeof x==='string')) return false;
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const digest=crypto.createHmac('sha256',secret).update(`${providerOrderId}|${paymentId}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest),Buffer.from(signature));
}
module.exports={checkSignature};
