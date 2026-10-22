const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const c=require('../lib/checkout'),handler=require('../api/mercado-pago-webhook');
test('webhook assinado com pedido ausente retorna 503 para nova entrega, nunca sucesso falso',async()=>{
 const original=c.notificar,env=process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST;
 process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST='ficticio';
 const ts='1792660000',id='ORDRECUPERACAO',rid='teste-local';
 const sig=crypto.createHmac('sha256','ficticio').update(`id:${id};request-id:${rid};ts:${ts};`).digest('hex');
 const req={method:'POST',query:{'data.id':id},headers:{'x-request-id':rid,'x-signature':`ts=${ts},v1=${sig}`}};
 const res=()=>({code:200,setHeader(){},status(n){this.code=n;return this;},end(){}});
 try{
  c.notificar=async()=>{throw Object.assign(Error('ausente'),{status:404});};
  const a=res();await handler(req,a);assert.equal(a.code,503);
  let recebido;c.notificar=async(id,ctx)=>{recebido={id,ctx};};
  const b=res();await handler(req,b);assert.equal(b.code,200);assert.equal(recebido.id,id);assert.equal(recebido.ctx.assinaturaValidada,true);
 }finally{c.notificar=original;if(env===undefined)delete process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST;else process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST=env;}
});
