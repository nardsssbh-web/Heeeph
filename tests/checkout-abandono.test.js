const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../lib/checkout');
const id='a'.repeat(32),token='b'.repeat(64),confirmacao={motivo:'alterar',confirmado:true};
function fixture(){
 const env={...process.env},fetch=global.fetch,db=new Map(),requests=[];
 Object.assign(process.env,{CHECKOUT_AMBIENTE:'teste',MERCADO_PAGO_ACCESS_TOKEN_TEST:'ficticio',MERCADO_PAGO_PUBLIC_KEY_TEST:'ficticia',UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'ficticio'});
 let order={id:'ORDTEST',external_reference:id,user_id:123,country_code:'BRA',total_amount:'34.50',total_paid_amount:'0.00',status:'action_required',status_detail:'waiting_transfer',transactions:{payments:[{amount:'34.50',paid_amount:'0.00',status:'action_required',status_detail:'waiting_transfer',payment_method:{id:'pix',qr_code:'PIX_ANTIGO'}}]}};
 const p={id,tokenHash:c.hash(token),ambiente:'teste',criadoEm:new Date().toISOString(),vendedor:'123',total:3450,itens:[{id:'placa',quantidade:1}],pagamento:{mpId:'ORDTEST'},webhookRecebido:{assinaturaValidada:true}};
 db.set(c.prefixo+id,JSON.stringify(p));let modo='ok',falhaSalvar=false;
 global.fetch=async(url,opts={})=>{
  requests.push({url,opts});const json=d=>({ok:true,status:200,json:async()=>structuredClone(d)});
  if(url==='https://redis.test'){
   const a=JSON.parse(opts.body);let result;
   if(a[0]==='GET')result=db.get(a[1])||null;
   else if(a[0]==='SET'){result=a.includes('NX')&&db.has(a[1])?null:'OK';if(result)db.set(a[1],a[2]);}
   else if(a[0]==='EVAL'&&a[2]===2){if(falhaSalvar&&order.status==='canceled')throw Error('Redis fora do ar');db.set(a[3],a[5]);result='OK';}
   else if(a[0]==='EVAL'){result=db.get(a[3])===a[4]?Number(db.delete(a[3])):0;}
   else throw Error('Comando inesperado');return json({result});
  }
  if(url.endsWith('/users/me'))return json({id:123,tags:['test_user']});
  if(url.includes('/v1/orders?'))return json({data:[]});
  if(url.endsWith('/cancel')){
   if(modo==='timeout')throw Error('timeout');
   if(modo==='aprovado'){order.status='processed';order.status_detail='accredited';order.total_paid_amount='34.50';Object.assign(order.transactions.payments[0],{paid_amount:'34.50',status:'processed',status_detail:'accredited'});}
   if(['ok','timeout-confirmado'].includes(modo)){order.status='canceled';order.status_detail='canceled';Object.assign(order.transactions.payments[0],{status:'canceled',status_detail:'canceled'});}
   if(modo==='timeout-confirmado')throw Error('Resposta perdida');
   return json(order);
  }
  if(url.endsWith('/v1/orders/ORDTEST')){if(modo==='consulta-falhou')throw Error('timeout');return json(order);}
  throw Error('Acesso inesperado: '+url);
 };
 return {db,requests,get order(){return order;},set modo(v){modo=v;},set falhaSalvar(v){falhaSalvar=v;},p,
  salvarP(){db.set(c.prefixo+id,JSON.stringify(p));},ler(){return JSON.parse(db.get(c.prefixo+id));},cancelamentos(){return requests.filter(r=>r.url.endsWith('/cancel'));},
  close(){global.fetch=fetch;process.env=env;}};
}
test('Pix cancelado por POST idempotente e confirmado por GET libera edição, preserva histórico e impede reutilização',async()=>{
 const f=fixture();try{
  const r=await c.abandonarPedido(id,token,confirmacao);
  assert.equal(r.edicaoLiberada,true);assert.equal(r.pagamento.status,'canceled');assert.equal(f.ler().saida.confirmada,true);
  assert.deepEqual(f.ler().itens,f.p.itens);assert.deepEqual(f.ler().webhookRecebido,f.p.webhookRecebido);
  assert.equal(f.cancelamentos().length,1);assert.match(f.cancelamentos()[0].opts.headers['X-Idempotency-Key'],/^heeeph-cancelar-/);
  const indice=f.requests.findIndex(r=>r.url.endsWith('/cancel'));
  assert.ok(f.requests.slice(indice+1).some(r=>r.url.endsWith('/ORDTEST')&&(!r.opts.method||r.opts.method==='GET')));
  await assert.rejects(()=>c.pagar(id,token,{metodo:'pix'}),/encerrada/);
  await assert.rejects(()=>c.recuperarPix(id,token),/encerrada/);
  await c.abandonarPedido(id,token,confirmacao);assert.equal(f.cancelamentos().length,1);
  assert.equal(f.requests.some(r=>r.url.endsWith('/v1/orders')&&r.opts.method==='POST'),false);
 }finally{f.close();}
});
test('sem tentativa permite encerrar antes do Pix sem cancelar nem criar cobrança',async()=>{
 const f=fixture();try{delete f.p.pagamento;f.salvarP();const r=await c.abandonarPedido(id,token,{...confirmacao,motivo:'desistir'});assert.equal(r.edicaoLiberada,true);assert.equal(r.pagamento,null);assert.equal(f.ler().saida.resultado,'sem_tentativa_de_pagamento');assert.equal(f.cancelamentos().length,0);}finally{f.close();}
});
test('aprovação concorrente, timeout ou cancelamento não confirmado bloqueiam nova cobrança sem falsificar status',async()=>{
 for(const modo of ['aprovado','timeout','pendente','consulta-falhou']){
  const f=fixture();try{f.modo=modo;await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(f.ler().saida.confirmada,false);assert.notEqual(f.ler().pagamento.status,'canceled');await assert.rejects(()=>c.pagar(id,token,{metodo:'pix'}),/encerrada/);}finally{f.close();}
 }
});
test('resposta perdida de cancelamento só libera quando GET confirma e persistência funciona',async()=>{
 const f=fixture();try{f.modo='timeout-confirmado';assert.equal((await c.abandonarPedido(id,token,confirmacao)).edicaoLiberada,true);}finally{f.close();}
 const g=fixture();try{g.falhaSalvar=true;await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(g.ler().saida.confirmada,false);g.falhaSalvar=false;assert.equal((await c.abandonarPedido(id,token,confirmacao)).edicaoLiberada,true);assert.equal(g.cancelamentos().length,1);}finally{g.close();}
});
test('tentativa não localizada, valor parcial, estado incompatível ou identidade divergente nunca são cancelados',async()=>{
 for(const tipo of ['desconhecida','parcial','multipla','divergente','processing','sem-valor']){
  const f=fixture();try{
   if(tipo==='desconhecida'){delete f.p.pagamento;f.salvarP();f.db.set(c.prefixo+'tentativa:'+id,'fingerprint');}
   if(tipo==='parcial')f.order.total_paid_amount='1.00';
   if(tipo==='multipla')f.order.transactions.payments.push(structuredClone(f.order.transactions.payments[0]));
   if(tipo==='divergente')f.order.external_reference='c'.repeat(32);
   if(tipo==='processing')f.order.status='processing';
   if(tipo==='sem-valor')delete f.order.total_paid_amount;
   await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(f.cancelamentos().length,0);assert.equal(f.ler().saida.confirmada,false);
  }finally{f.close();}
 }
});
test('confirmação, token e ambiente de testes são obrigatórios antes de cancelar',async()=>{
 const f=fixture();try{
  await assert.rejects(()=>c.abandonarPedido(id,token,{motivo:'alterar'}));await assert.rejects(()=>c.abandonarPedido(id,'errado',confirmacao));
  assert.equal(f.ler().saida,undefined);assert.equal(f.cancelamentos().length,0);
  process.env.CHECKOUT_AMBIENTE='producao';await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(f.cancelamentos().length,0);
 }finally{f.close();}
});
test('pagamento já aprovado não solicita cancelamento; expiração confirmada libera sem novo POST',async()=>{
 for(const aprovado of [true,false]){
  const f=fixture();try{
   Object.assign(f.order,{status:aprovado?'processed':'canceled',status_detail:aprovado?'accredited':'expired',total_paid_amount:aprovado?'34.50':'0.00'});
   Object.assign(f.order.transactions.payments[0],{status:aprovado?'processed':'expired',status_detail:aprovado?'accredited':'expired',paid_amount:aprovado?'34.50':'0.00'});
   if(aprovado){await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao),/aprovado/);assert.equal(f.ler().pagamento.aprovado,true);}
   else {assert.equal((await c.abandonarPedido(id,token,confirmacao)).edicaoLiberada,true);assert.equal(f.ler().pagamento.detalhe,'expired');}
   assert.equal(f.cancelamentos().length,0);
  }finally{f.close();}
 }
});
