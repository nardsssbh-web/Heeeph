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
   await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao),tipo==='sem-valor'?/Nenhum cancelamento foi solicitado/:undefined);assert.equal(f.cancelamentos().length,0);assert.equal(f.ler().saida.confirmada,false);
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
function expirarPix(f){
 Object.assign(f.order,{status:'canceled',status_detail:'expired',total_paid_amount:'34.50'});
 Object.assign(f.order.transactions.payments[0],{status:'expired',status_detail:'expired'});
 delete f.order.transactions.payments[0].paid_amount;
}
test('retorno real do sandbox: Pix expirado com total nominal e paid_amount ausente libera alteração e desistência sem cancelar',async()=>{
 for(const motivo of ['alterar','desistir']){
  const f=fixture();try{expirarPix(f);
   const r=await c.abandonarPedido(id,token,{...confirmacao,motivo});
   assert.equal(r.edicaoLiberada,true);assert.equal(r.pagamento.pixExpiradoConfirmado,true);assert.equal(r.pagamento.aprovado,false);
   assert.equal(r.pagamento.valoresMP.totalPago,3450);assert.equal(r.pagamento.valoresMP.transacaoPaga,null);
   assert.equal(f.ler().saida.confirmada,true);assert.equal(f.ler().pagamento.detalhe,'expired');assert.equal(f.cancelamentos().length,0);
   assert.deepEqual(f.ler().itens,f.p.itens);await assert.rejects(()=>c.recuperarPix(id,token),/encerrada/);
   await assert.rejects(()=>c.pagar(id,token,{metodo:'pix'}),/encerrada/);
  }finally{f.close();}
 }
});
test('total nominal isolado não libera Pix pendente nem estados ou respostas inconsistentes',async()=>{
 const variantes=[
  d=>{d.status='action_required';d.status_detail='waiting_capture';Object.assign(d.transactions.payments[0],{status:'action_required',status_detail:'waiting_transfer'});},
  d=>{d.transactions.payments[0].paid_amount='0.01';},
  d=>{d.transactions.payments[0].paid_amount='34.50';},
  d=>{d.total_paid_amount='0.01';},
  d=>{d.total_paid_amount='35.00';},
  d=>{d.total_paid_amount='0.00';d.transactions.payments[0].paid_amount='0.00';d.status_detail='unknown';},
  d=>{delete d.total_paid_amount;},
  d=>{d.transactions.payments[0].paid_amount='inválido';},
  d=>{d.transactions.payments[0].amount='1.00';},
  d=>{d.transactions.payments[0].status='processed';d.transactions.payments[0].status_detail='accredited';},
  d=>{d.status='processing';},d=>{d.status_detail='unknown';},
  d=>{d.transactions.payments[0].status_detail='unknown';},
  d=>{d.transactions.payments.push(structuredClone(d.transactions.payments[0]));},
  d=>{delete d.user_id;},d=>{d.user_id=999;},d=>{d.total_amount='1.00';},
  d=>{d.external_reference='c'.repeat(32);},
  d=>{d.errors=[{code:'inconsistent_payment'}];}
 ];
 for(const variar of variantes){const f=fixture();try{expirarPix(f);variar(f.order);
  await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(f.ler().saida.confirmada,false);assert.equal(f.cancelamentos().length,0);
 }finally{f.close();}}
});
test('aprovação e recebimento anteriores continuam bloqueando após resposta posterior de expiração',async()=>{
 for(const anterior of [{aprovado:true,status:'processed'},{aprovado:false,status:'processing',transacoes:[{status:'processed'}]},
  {aprovado:false,status:'canceled',transacoes:[{status:'expired',metodo:'pix'}],valoresMP:{transacaoPaga:1}}]){
  const f=fixture();try{f.p.pagamento={mpId:'ORDTEST',...anterior};f.salvarP();expirarPix(f);
   await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(f.ler().pagamento.impedimentoEncerramento,true);
   await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(f.ler().saida.confirmada,false);assert.equal(f.cancelamentos().length,0);
  }finally{f.close();}
 }
});
test('exceção do total nominal expirado é restrita ao ambiente de testes',()=>{
 const f=fixture();try{expirarPix(f);process.env.CHECKOUT_AMBIENTE='producao';const p={...f.p,ambiente:'producao'};
  const pg=c.conferirPagamento(p,f.order);assert.equal(pg.pixExpiradoConfirmado,false);assert.equal(pg.encerradoSemPagamento,false);
 }finally{f.close();}
});

function pendenteNominalPreview(f){
 process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF='codex/preparacao-vendas';
 f.order.total_paid_amount='34.50';delete f.order.transactions.payments[0].paid_amount;
}
test('Pix pendente nominal no Preview só libera após POST idempotente, GET cancelado e persistência',async()=>{
 for(const motivo of ['alterar','desistir']){
  const f=fixture();try{pendenteNominalPreview(f);
   const antes=await c.status(id,token);assert.equal(antes.pagamento.cancelavel,true);assert.equal(antes.pagamento.encerradoSemPagamento,false);
   const r=await c.abandonarPedido(id,token,{motivo,confirmado:true});
   assert.equal(r.edicaoLiberada,true);assert.equal(r.pagamento.status,'canceled');assert.equal(r.pagamento.detalhe,'canceled');
   assert.equal(r.pagamento.encerradoSemPagamento,true);assert.equal(r.pagamento.aprovado,false);
   assert.equal(r.pagamento.valoresMP.totalPago,3450);assert.equal(r.pagamento.valoresMP.transacaoPaga,null);
   assert.equal(f.cancelamentos().length,1);assert.equal(f.cancelamentos()[0].opts.method,'POST');
   const i=f.requests.findIndex(r=>r.url.endsWith('/cancel'));
   assert.ok(f.requests.slice(i+1).some(r=>r.url.endsWith('/ORDTEST')&&r.opts.method==='GET'));
   const salvo=f.ler();assert.equal(salvo.saida.confirmada,true);assert.equal(salvo.tokenHash,f.p.tokenHash);
   assert.deepEqual(salvo.itens,f.p.itens);assert.deepEqual(salvo.webhookRecebido,f.p.webhookRecebido);
   const recarregado=await c.status(id,token);assert.equal(recarregado.saida.confirmada,true);
   await c.abandonarPedido(id,token,{motivo,confirmado:true});assert.equal(f.cancelamentos().length,1);
   await assert.rejects(()=>c.pagar(id,token,{metodo:'pix'}),/encerrada/);
   assert.equal(f.requests.some(r=>r.url.endsWith('/v1/orders')&&r.opts.method==='POST'),false);
  }finally{f.close();}
 }
});
test('nominal pendente mantém bloqueio diante de pagamento concorrente, timeout, falha ou falta de confirmação',async()=>{
 for(const modo of ['aprovado','timeout','pendente','consulta-falhou']){
  const f=fixture();try{pendenteNominalPreview(f);f.modo=modo;
   await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(f.ler().saida.confirmada,false);
   assert.notEqual(f.ler().pagamento.status,'canceled');await assert.rejects(()=>c.pagar(id,token,{metodo:'pix'}),/encerrada/);
  }finally{f.close();}
 }
 const f=fixture();try{pendenteNominalPreview(f);f.modo='timeout-confirmado';
  assert.equal((await c.abandonarPedido(id,token,confirmacao)).edicaoLiberada,true);assert.equal(f.cancelamentos().length,1);
 }finally{f.close();}
 const g=fixture();try{pendenteNominalPreview(g);g.falhaSalvar=true;
  await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(g.ler().saida.confirmada,false);
  g.falhaSalvar=false;assert.equal((await c.abandonarPedido(id,token,confirmacao)).edicaoLiberada,true);assert.equal(g.cancelamentos().length,1);
 }finally{g.close();}
});
test('nominal pendente não é autorização isolada: contexto, estados, identidade, montantes e histórico devem conferir',async()=>{
 const variantes=[
  f=>{delete process.env.VERCEL_ENV;},f=>{process.env.VERCEL_ENV='production';},
  f=>{process.env.VERCEL_GIT_COMMIT_REF='main';},f=>{process.env.CHECKOUT_AMBIENTE='producao';},
  f=>{f.order.status='processing';},f=>{f.order.status_detail='waiting_capture';},
  f=>{f.order.transactions.payments[0].status='processing';},f=>{f.order.transactions.payments[0].status_detail='unknown';},
  f=>{f.order.transactions.payments[0].payment_method.id='master';},
  f=>{f.order.transactions.payments[0].paid_amount='0.01';},f=>{f.order.transactions.payments[0].paid_amount='34.50';},
  f=>{f.order.transactions.payments[0].paid_amount='inválido';},
  f=>{f.order.total_paid_amount='1.00';},f=>{delete f.order.total_paid_amount;},f=>{f.order.total_paid_amount='inválido';},
  f=>{f.order.transactions.payments[0].amount='1.00';},f=>{delete f.order.user_id;},f=>{f.order.user_id=999;},
  f=>{f.order.external_reference='c'.repeat(32);},f=>{f.order.total_amount='1.00';},f=>{f.order.country_code='ARG';},
  f=>{f.order.transactions.payments.push(structuredClone(f.order.transactions.payments[0]));},
  f=>{f.order.errors=[{code:'inconsistent_payment'}];},
  f=>{f.p.pagamento.aprovado=true;f.salvarP();},
  f=>{f.p.pagamento.impedimentoEncerramento=true;f.salvarP();},
  f=>{f.p.pagamento.transacoes=[{metodo:'pix',status:'processed'}];f.salvarP();},
  f=>{f.p.pagamento.transacoes=[{metodo:'pix',status:'action_required'}];f.p.pagamento.valoresMP={transacaoPaga:1};f.salvarP();}
 ];
 for(const variar of variantes){const f=fixture();try{pendenteNominalPreview(f);variar(f);
  await assert.rejects(()=>c.abandonarPedido(id,token,confirmacao));assert.equal(f.cancelamentos().length,0);assert.notEqual(JSON.parse(f.db.get('heeeph:teste:'+id)).saida?.confirmada,true);
 }finally{f.close();}}
});
test('nominal cancelado só é terminal quando ambos os níveis confirmam cancelamento no Preview autorizado',()=>{
 const f=fixture();try{pendenteNominalPreview(f);
  Object.assign(f.order,{status:'canceled',status_detail:'canceled'});Object.assign(f.order.transactions.payments[0],{status:'canceled',status_detail:'canceled'});
  assert.equal(c.conferirPagamento(f.p,f.order).encerradoSemPagamento,true);
  const variantes=[d=>{d.status_detail='unknown';},d=>{d.transactions.payments[0].status='action_required';},
   d=>{d.transactions.payments[0].status_detail='waiting_transfer';},d=>{d.transactions.payments[0].paid_amount='0.01';}];
  for(const variar of variantes){const d=structuredClone(f.order);variar(d);assert.equal(c.conferirPagamento(f.p,d).encerradoSemPagamento,false);}
  process.env.VERCEL_ENV='production';assert.equal(c.conferirPagamento(f.p,f.order).encerradoSemPagamento,false);
  process.env.VERCEL_ENV='preview';process.env.CHECKOUT_AMBIENTE='producao';assert.equal(c.conferirPagamento({...f.p,ambiente:'producao'},f.order).encerradoSemPagamento,false);
 }finally{f.close();}
});
