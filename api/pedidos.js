const crypto=require('node:crypto');
const c=require('../lib/checkout');
const listar=require('../lib/pedidos-lista');
const etapas=['Recebido','Em Preparação','Saiu para entrega','Entregue'];
async function gestao(id){const raw=await c.redis(['GET',c.prefixo+'gestao:'+id]);return raw?JSON.parse(raw):{status:'Recebido'};}
function seguro(p,g){const {id,ambiente,criadoEm,cliente,itens,subtotal,total,frete,pacotes,pagamento,respostaMP,webhookRecebido}=p;return {id,ambiente,criadoEm,cliente,itens,subtotal,total,frete,pacotes,pagamento:pagamento?{...pagamento,...(pagamento.autenticacao?{autenticacao:{necessaria:pagamento.autenticacao.necessaria}}:{})}:pagamento,respostaMP,webhookRecebido,gestao:g};}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).end();
  const esperado=process.env.HEEEPH_PEDIDOS_ADMIN_TOKEN;
  const recebido=String(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!esperado||esperado.length<32||!crypto.timingSafeEqual(Buffer.from(c.hash(esperado)),Buffer.from(c.hash(recebido))))return res.status(401).json({mensagem:'Acesso não autorizado.'});
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(['etapa','excluir'].includes(b.acao)){
      return await c.exclusivo(b.id,async()=>{
      const p=await c.buscar(b.id);
      if(b.acao==='etapa'&&!etapas.includes(b.status))return res.status(400).json({mensagem:'Status do pedido inválido.'});
      if(b.acao==='excluir'&&b.confirmacao!==p.id)return res.status(400).json({mensagem:'Confirme o pedido que deseja excluir.'});
      const g=await gestao(p.id);
      if(g.excluido)return res.status(404).json({mensagem:'Pedido excluído do painel.'});
      const atualizado={...g,atualizadoEm:new Date().toISOString(),...(b.acao==='excluir'?{excluido:true}:{status:b.status})};
      await c.redis(['SET',c.prefixo+'gestao:'+p.id,JSON.stringify(atualizado),...c.expiracao()]);
      return res.json(b.acao==='excluir'?{excluido:true,id:p.id}:{pedido:seguro(p,atualizado),teste:c.ambiente().teste});
      });
    }
    if(b.acao==='consultar'){
      const p=await c.buscar(b.id);
      const g=await gestao(p.id);
      if(g.excluido)return res.status(404).json({mensagem:'Pedido excluído do painel.'});
      const atualizado=await c.atualizar(p);
      return res.json({pedido:{...seguro(atualizado,g),payloadPix:await c.conferirPayloadPix(atualizado)},teste:c.ambiente().teste});
    }
    if(b.acao&&b.acao!=='listar')return res.status(400).json({mensagem:'Ação não permitida.'});
    const pagina=await listar(b);
    return res.json({...pagina,pedidos:pagina.pedidos.map(({p,g})=>seguro(p,g)),teste:c.ambiente().teste});
  }catch(e){return res.status(e instanceof SyntaxError?400:e.status||503).json({mensagem:'Não foi possível carregar os pedidos.'});}
};

