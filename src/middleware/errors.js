const {ZodError}=require('zod');
function notFound(req,res) {res.status(404).json({ok:false,error:'Not found.'});}
function errorHandler(err,req,res,next) {
  if (err instanceof ZodError) return res.status(400).json({ok:false,error:err.issues.map(x=>x.path.join('.')+': '+x.message).join('; ')});
  if (err.code===11000) return res.status(409).json({ok:false,error:'This record already exists.'});
  if (err.name==='CastError') return res.status(400).json({ok:false,error:'Invalid identifier.'});
  if (err.name==='ValidationError') return res.status(400).json({ok:false,error:'Invalid data.'});
  if (err.status && err.status<500) return res.status(err.status).json({ok:false,error:err.message});
  console.error('Request failed:',err.message);
  res.status(500).json({ok:false,error:'Something went wrong. Please try again.'});
}
module.exports={notFound,errorHandler};
