const crypto=require('node:crypto');
const c=require('../lib/checkout');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).end();
  const esperado=process.env.HEEEPH_PEDIDOS_ADMIN_TOKEN;
  const recebido=String(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!esperado||esperado.length<32||!crypto.timingSafeEqual(Buffer.from(c.hash(esperado)),Buffer.from(c.hash(recebido))))return res.status(401).json({mensagem:'Acesso não autorizado.'});
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(b.acao==='consultar'){
      const p=await c.buscar(b.id);
      const atualizado=await c.atualizar(p);
      const {tokenHash,cotacao,proximaChave,mpRecuperacao,...pedido}=atualizado;
      return res.json({pedido,teste:true});
    }
    if(b.acao&&b.acao!=='listar')return res.status(400).json({mensagem:'Ação não permitida.'});
    const ids=await c.redis(['ZREVRANGE',c.prefixo+'lista',0,49]);
    const pedidos=[];
    for(const id of ids){try{const p=await c.buscar(id); const {tokenHash,cotacao,proximaChave,mpRecuperacao,...dados}=p;pedidos.push(dados);}catch(e){if(e.status!==404)throw e;}}
    return res.json({pedidos,teste:true});
  }catch(e){return res.status(503).json({mensagem:'Não foi possível carregar os pedidos.'});}
};

