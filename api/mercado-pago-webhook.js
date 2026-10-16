const c = require('../lib/checkout');
const {assinaturaValida}=require('../lib/webhook');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).end();
  const registrar=(resultado,http,validada=false)=>console.info('MP_WEBHOOK',JSON.stringify({resultado,http,assinaturaValidada:validada,...(/^ORD[A-Za-z0-9]{1,90}$/.test(req.query?.['data.id']||'')?{order:req.query['data.id']}:{})}));
  let ambiente;try{ambiente=c.ambiente();}catch{return res.status(503).end();}
  if(!ambiente.webhookSecret){registrar('segredo_nao_configurado',503);return res.status(503).end();}
  if(!assinaturaValida(req,ambiente.webhookSecret)){registrar('assinatura_invalida',401);return res.status(401).end();}
  try{
    await c.notificar(req.query['data.id'],{assinaturaValidada:true});
    registrar('processado_e_persistido',200,true);
    return res.status(200).end();
  }catch(e){const http=e.status===404?200:503;registrar(e.status===404?'recurso_nao_encontrado':'falha_na_conferencia',http,true);return res.status(http).end();}
};

