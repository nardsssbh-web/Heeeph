const c = require('../lib/checkout');
const {assinaturaValida}=require('../lib/webhook');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).end();
  if(!process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST)return res.status(503).end();
  if(!assinaturaValida(req,process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST))return res.status(401).end();
  try{
    const d=await c.mp('/v1/orders/'+encodeURIComponent(req.query['data.id']));
    let p;try{p=await c.buscar(d.external_reference);}catch(e){if(e.status===404)return res.status(200).end();throw e;}
    p.pagamento=c.conferirPagamento(p,d);await c.salvar(p);
    return res.status(200).end();
  }catch(e){return res.status(503).end();}
};
