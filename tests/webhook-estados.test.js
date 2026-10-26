const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const c=require('../lib/checkout'),handler=require('../api/mercado-pago-webhook');
const id='e'.repeat(32),mpId='ORDWEBTEST';
function fixture(){
 const env={...process.env},fetch=global.fetch,db=new Map(),requests=[];
 Object.assign(process.env,{CHECKOUT_AMBIENTE:'teste',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/preparacao-vendas',MERCADO_PAGO_ACCESS_TOKEN_TEST:'ficticio',MERCADO_PAGO_PUBLIC_KEY_TEST:'ficticia',MERCADO_PAGO_WEBHOOK_SECRET_TEST:'segredo-local',UPSTASH_REDIS_REST_URL:'https://redis.webhook.test',UPSTASH_REDIS_REST_TOKEN:'ficticio'});
 const p={id,ambiente:'teste',vendedor:'123',tokenHash:c.hash('b'.repeat(64)),criadoEm:'2026-10-23T12:00:00Z',total:3926,subtotal:2490,
  itens:[{id:'placa',medida:'20x28cm',quantidade:1,centavos:2490}],frete:{id:'1',centavos:1436,servico:'Standard'},pacotes:[{gramas:180}],pagamento:{mpId}};
 db.set(c.prefixo+id,JSON.stringify(p));let writes=0,failSave=false,queue=[];
 let order={id:mpId,external_reference:id,user_id:123,country_code:'BRA',total_amount:'39.26',total_paid_amount:'0.00',status:'action_required',status_detail:'waiting_transfer',transactions:{payments:[{amount:'39.26',paid_amount:'0.00',status:'action_required',status_detail:'waiting_transfer',payment_method:{id:'pix'}}]}};
 global.fetch=async(url,opts={})=>{
  requests.push({url,opts});const json=d=>({ok:true,status:200,json:async()=>structuredClone(d)});
  if(url==='https://redis.webhook.test'){
   const a=JSON.parse(opts.body);let result;
   if(a[0]==='GET')result=db.get(a[1])||null;
   else if(a[0]==='SET'){result=a.includes('NX')&&db.has(a[1])?null:'OK';if(result)db.set(a[1],a[2]);}
   else if(a[0]==='EVAL'&&a[2]===2){if(failSave)throw Error('Redis indisponível');db.set(a[3],a[5]);writes++;result='OK';}
   else if(a[0]==='EVAL'){result=db.get(a[3])===a[4]?Number(db.delete(a[3])):0;}
   else throw Error('Redis inesperado');return json({result});
  }
  assert.equal(opts.method,'GET','Nenhuma operação financeira é permitida');
  if(url==='https://api.mercadopago.com/users/me')return json({id:123,tags:['test_user']});
  if(url==='https://api.mercadopago.com/v1/orders/'+mpId)return json(queue.length?queue.shift():order);
  throw Error('Acesso externo não simulado: '+url);
 };
 return {p,requests,db,get order(){return order;},get writes(){return writes;},set failSave(v){failSave=v;},set queue(v){queue=v;},ler(){return JSON.parse(db.get(c.prefixo+id));},
  estado(status,detail,txStatus=status,txDetail=detail){Object.assign(order,{status,status_detail:detail});Object.assign(order.transactions.payments[0],{status:txStatus,status_detail:txDetail});if(status==='processed'){order.total_paid_amount='39.26';order.transactions.payments[0].paid_amount='39.26';}},
  close(){global.fetch=fetch;process.env=env;}};
}
async function enviar(body={},alterarReq){
 const ts='1742505638683',rid='evento-local';const v1=crypto.createHmac('sha256','segredo-local').update(`id:${mpId};request-id:${rid};ts:${ts};`).digest('hex');
 const req={method:'POST',query:{'data.id':mpId},headers:{'x-request-id':rid,'x-signature':`ts=${ts},v1=${v1}`},body};
 alterarReq?.(req);const res={code:200,setHeader(){},status(n){this.code=n;return this;},end(){}};await handler(req,res);return res.code;
}
test('assinatura inválida não consulta APIs; corpo forjado nunca confirma pagamento',async()=>{
 const f=fixture();try{
  assert.equal(await enviar({},r=>r.headers['x-signature']='ts=1,v1='+'0'.repeat(64)),401);assert.equal(f.requests.length,0);
  assert.equal(await enviar({data:{id:'ORDOUTRO',status:'processed',total_amount:'0.01'},status:'approved'}),200);
  assert.equal(f.ler().pagamento.status,'action_required');assert.equal(f.ler().pagamento.aprovado,false);assert.equal(f.writes,1);
  assert.deepEqual(f.ler().itens,f.p.itens);assert.deepEqual(f.ler().frete,f.p.frete);assert.equal(f.ler().total,3926);
 }finally{f.close();}
});
test('duplicata consulta o provedor mas não repete persistência; mudança real atualiza apenas o mesmo pedido',async()=>{
 const f=fixture();try{
  assert.equal(await enviar(),200);const primeiro=f.ler().webhookRecebido;
  assert.equal(await enviar(),200);assert.equal(f.writes,1);assert.deepEqual(f.ler().webhookRecebido,primeiro);
  f.estado('processed','accredited');assert.equal(await enviar({status:'pending'}),200);assert.equal(f.ler().pagamento.aprovado,true);assert.equal(f.writes,2);
  assert.equal(await enviar(),200);assert.equal(f.writes,2);
  assert.deepEqual(f.ler().itens,f.p.itens);assert.deepEqual(f.ler().frete,f.p.frete);assert.deepEqual(f.ler().pacotes,f.p.pacotes);assert.equal(f.ler().total,f.p.total);assert.equal(f.ler().tokenHash,f.p.tokenHash);
  assert.equal([...f.db.keys()].filter(k=>/^heeeph:teste:[a-f0-9]{32}$/.test(k)).length,1);
 }finally{f.close();}
});
test('evento atrasado ou fora de ordem usa consulta dentro do lock e não regride aprovação confirmada',async()=>{
 const f=fixture();try{
  const antigo=structuredClone(f.order);f.estado('processed','accredited');
  f.queue=[antigo,structuredClone(f.order)];assert.equal(await enviar({status:'pending'}),200);assert.equal(f.ler().pagamento.aprovado,true);
  const salvo=f.ler();Object.assign(f.order,antigo);
  assert.equal(await enviar(),503);assert.deepEqual(f.ler(),salvo);assert.equal(f.writes,1);
 }finally{f.close();}
});
test('estados pendente, recusado, cancelado e expirado vêm da API sem alterar valores originais',async()=>{
 for(const [s,d,ts,td] of [['action_required','waiting_transfer'],['failed','failed','failed','rejected_by_issuer'],['canceled','canceled','canceled','canceled_transaction'],['canceled','expired','expired','expired']]){
  const f=fixture();try{f.estado(s,d,ts||s,td||d);assert.equal(await enviar({status:'approved'}),200);const p=f.ler();
   assert.equal(p.pagamento.status,s);assert.equal(p.pagamento.detalhe,d);assert.equal(p.pagamento.aprovado,false);
   assert.deepEqual(p.itens,f.p.itens);assert.deepEqual(p.frete,f.p.frete);assert.equal(p.total,3926);assert.equal(p.subtotal,2490);
   if(s==='canceled'||s==='failed'){f.estado('action_required','waiting_transfer');assert.equal(await enviar(),503);assert.equal(f.ler().pagamento.status,s);}
  }finally{f.close();}
 }
});

test('duplicatas concorrentes são serializadas e a reentrega não cria pedido nem repete escrita',async()=>{
 const f=fixture();try{
  const codigos=await Promise.all([enviar(),enviar()]);assert.deepEqual(codigos.sort(),[200,503]);
  assert.equal(f.writes,1);assert.equal(await enviar(),200);assert.equal(f.writes,1);
  assert.equal(f.ler().id,id);assert.equal(f.ler().webhookRecebido.assinaturaValidada,true);
 }finally{f.close();}
});

test('status de aprovado não confirma recebimento quando os valores da API não conferem',async()=>{
 for(const variar of [d=>{d.total_paid_amount='0.01';},d=>{d.transactions.payments[0].amount='0.01';},d=>{d.transactions.payments[0].paid_amount='0.01';}]){
  const f=fixture();try{f.estado('processed','accredited');variar(f.order);
   assert.equal(await enviar({status:'approved',amount:3926}),200);assert.equal(f.ler().pagamento.aprovado,false);
   assert.equal(f.ler().total,3926);assert.deepEqual(f.ler().itens,f.p.itens);assert.deepEqual(f.ler().frete,f.p.frete);
  }finally{f.close();}
 }
});
test('identidade/valor divergentes na reconsulta e falha Redis não recebem confirmação de sucesso',async()=>{
 for(const variar of [d=>{d.id='ORDOUTRO';},d=>{d.external_reference='a'.repeat(32);},d=>{d.user_id=999;},d=>{d.total_amount='0.01';}]){
  const f=fixture();try{const errado=structuredClone(f.order);variar(errado);f.queue=[structuredClone(f.order),errado];
   assert.equal(await enviar(),503);assert.deepEqual(f.ler(),f.p);assert.equal(f.writes,0);
  }finally{f.close();}
 }
 const f=fixture();try{f.failSave=true;assert.equal(await enviar(),503);assert.deepEqual(f.ler(),f.p);f.failSave=false;assert.equal(await enviar(),200);assert.equal(f.writes,1);}finally{f.close();}
});
