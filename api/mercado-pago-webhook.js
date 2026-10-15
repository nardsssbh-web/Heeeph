const c = require('../lib/checkout');
const {assinaturaValida}=require('../lib/webhook');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).end();
  let ambiente;try{ambiente=c.ambiente();}catch{return res.status(503).end();}
  if(!ambiente.webhookSecret)return res.status(503).end();
  if(!assinaturaValida(req,ambiente.webhookSecret))return res.status(401).end();
  try{
    await c.notificar(req.query['data.id']);
    return res.status(200).end();
  }catch(e){return res.status(e.status===404?200:503).end();}
};

