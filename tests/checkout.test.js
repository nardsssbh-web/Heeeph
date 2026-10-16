const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const c=require('../lib/checkout'),{assinaturaValida}=require('../lib/webhook');
const body={chavePreparacao:'c'.repeat(64),cep:'30220060',itens:[{id:'games-free-fire',medida:'10x15cm',quantidade:1}],servico:'1',frete:10.79,cliente:{nome:'Comprador Teste',email:'teste@testuser.com',cpf:'19119119100',telefone:'11987654321',termos:true,endereco:{rua:'Rua Teste',numero:'10',bairro:'Centro',cidade:'Belo Horizonte',uf:'MG',complemento:''}}};
function fixture(){
 const db=new Map(),requests=[];const previous=global.fetch;const env={...process.env};
 Object.assign(process.env,{CHECKOUT_TESTE_ATIVO:'true',MERCADO_PAGO_ACCESS_TOKEN_TEST:'segredo-mp',MERCADO_PAGO_PUBLIC_KEY_TEST:'public-test',UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'segredo-db',FRETE_ATIVO:'true',MELHOR_ENVIO_AMBIENTE:'producao',MELHOR_ENVIO_TOKEN:'segredo-frete',MELHOR_ENVIO_USER_AGENT:'HEEEPH'});
 let preco=10.79,testUser=true,orders=0,timeout=false,lastOrder,recusa=false,semVendedor=false;
 global.fetch=async(url,opts={})=>{
  requests.push({url,opts});const json=d=>({ok:true,json:async()=>d});
  if(url==='https://redis.test'){
   const [cmd,key,value,...args]=JSON.parse(opts.body);let result;
   if(cmd==='SET'){if(args.includes('NX')&&db.has(key))result=null;else{db.set(key,value);result='OK';}}
   else if(cmd==='GET')result=db.get(key)||null;else if(cmd==='ZADD')result=1;else if(cmd==='EVAL'){const k=JSON.parse(opts.body)[3],fp=JSON.parse(opts.body)[4];result=db.get(k)===fp?Number(db.delete(k)):0;}else throw Error(cmd);
   return json({result});
  }
  if(url.endsWith('/users/me'))return json({id:123,tags:testUser?['test_user']:[]});
  if(url.includes('melhorenvio'))return json([{id:1,company:{name:'JeT'},name:'Standard',price:preco,delivery_time:4}]);
  if(url.includes('/v1/orders?'))return json({data:lastOrder?[lastOrder]:[]});
  if(url.endsWith('/v1/orders')){orders++;if(recusa)return {ok:false,status:400,json:async()=>({errors:[{code:'invalid_email_for_sandbox'}]})};if(timeout)throw new Error('timeout');const payload=JSON.parse(opts.body);lastOrder={id:'ORDTEST',user_id:123,country_code:'BRA',external_reference:payload.external_reference,total_amount:payload.total_amount,total_paid_amount:payload.total_amount,status:'processed',status_detail:'accredited',transactions:{payments:[{status:'processed',status_detail:'accredited',payment_method:{id:'pix'}}]}};if(semVendedor)delete lastOrder.user_id;return json(lastOrder);}
  if(url.endsWith('/v1/orders/ORDTEST'))return json(lastOrder);throw Error(url);
 };
 return{requests,db,setPreco:v=>preco=v,setTest:v=>testUser=v,setTimeout:v=>timeout=v,setRecusa:v=>recusa=v,setSemVendedor:v=>semVendedor=v,get orders(){return orders;},close(){global.fetch=previous;process.env=env;}};
}
test('consulta Pix recupera código e ausência de imagem sem criar outra order',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body);await c.pagar(p.id,p.token,{metodo:'pix'});
  const order=await c.mp('/v1/orders/ORDTEST');
  Object.assign(order,{status:'action_required',status_detail:'waiting_transfer',total_paid_amount:'0.00'});
  Object.assign(order.transactions.payments[0],{status:'action_required',status_detail:'waiting_transfer',payment_method:{id:'pix',qr_code:'000201TESTE',qr_code_base64:''}});
  const r=await c.status(p.id,p.token);
  assert.equal(r.pagamento.pix.codigo,'000201TESTE');assert.equal(r.pagamento.pix.imagem,'');assert.equal(r.pagamento.aprovado,false);assert.equal(f.orders,1);
  delete order.transactions.payments[0].payment_method.qr_code;
  const semDados=await c.status(p.id,p.token);assert.equal(semDados.pagamento.pix.codigo,'');assert.equal(f.orders,1);
 }finally{f.close();}
});

test('troca reconsulta recusa, preserva pedido e não cria pagamento; pendente ou pago é bloqueado',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body);await c.pagar(p.id,p.token,{metodo:'pix'});
  const order=await c.mp('/v1/orders/ORDTEST');
  await assert.rejects(()=>c.liberarNovaCompra(p.id,p.token),{status:409});
  Object.assign(order,{status:'failed',total_paid_amount:'0.00'});Object.assign(order.transactions.payments[0],{status:'failed',paid_amount:'0.00'});
  await assert.rejects(()=>c.liberarNovaCompra(p.id,'f'.repeat(64)),{status:401});
  const r=await c.liberarNovaCompra(p.id,p.token);assert.equal(r.checkout.cep,body.cep);assert.equal(r.checkout.frete,10.79);assert.equal(f.orders,1);assert.ok(f.db.has(c.prefixo+p.id));
  order.status='processing';await assert.rejects(()=>c.liberarNovaCompra(p.id,p.token),{status:409});
  order.status='failed';order.total_paid_amount='1.00';await assert.rejects(()=>c.liberarNovaCompra(p.id,p.token),{status:409});assert.equal(f.orders,1);
 }finally{f.close();}
});

test('confere APRO e email contra fingerprint sem criar outra cobrança nem revelar payload',async()=>{
 const f=fixture();try{
  const b=structuredClone(body);b.cliente.nome='APRO TESTE';b.cliente.email='test@testuser.com';
  const p=await c.preparar(b);await c.pagar(p.id,p.token,{metodo:'pix'});
  const registro=JSON.parse(f.db.get(c.prefixo+p.id));
  assert.deepEqual(await c.conferirPayloadPix(registro),{conferido:true,primeiroNomeAPRO:true,emailTeste:true});
  registro.cliente.nome='Outro Nome';assert.equal((await c.conferirPayloadPix(registro)).conferido,false);assert.equal(f.orders,1);
 }finally{f.close();}
});

test('402 com order em data preserva identificador e códigos seguros, sem reenviar pagamento',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body),anterior=global.fetch;let posts=0;
  const order={id:'ORD402',external_reference:p.id,total_amount:'23.69',total_paid_amount:'0.00',country_code:'BRA',user_id:123,status:'failed',status_detail:'failed',transactions:{payments:[{status:'failed',status_detail:'processing_error',payment_method:{id:'pix'}}]}};
  global.fetch=async(url,opts={})=>{
   if(url.endsWith('/v1/orders')&&opts.method==='POST'){posts++;return {ok:false,status:402,headers:{get:()=> 'req-seguro-123'},json:async()=>({errors:[{code:'failed',message:'segredo que não pode sair',cause:[{code:'processing_error',description:'cpf secreto'}]}],data:order})};}
   if(url.endsWith('/v1/orders/ORD402'))return {ok:true,status:200,json:async()=>order};
   return anterior(url,opts);
  };
  const r=await c.pagar(p.id,p.token,{metodo:'pix'});assert.equal(r.pagamento.mpId,'ORD402');assert.equal(r.pagamento.aprovado,false);
  const guardado=JSON.parse(f.db.get(c.prefixo+p.id));assert.deepEqual(guardado.respostaMP,{http:402,codigos:['failed','processing_error'],requestId:'req-seguro-123'});assert.ok(!JSON.stringify(guardado).includes('segredo que não pode sair'));
  await c.status(p.id,p.token);assert.equal(posts,1);
 }finally{f.close();}
});

test('APRO Teste produz first_name APRO e last_name Teste sem alterar o nome salvo ou enviar pagamento',()=>{
 for(const nome of ['APRO Teste','  APRO   Teste  ']){
  const cliente=c.clienteValido({...body.cliente,nome,email:'test@testuser.com'},body.cep);
  const salvo=cliente.nome;
  const p={id:'pedido-local',cliente,itens:[],total:100,frete:{centavos:0,transportadora:'JeT',servico:'Standard'}};
  const payload=c.payloadPagamento(p,{id:'pix',type:'bank_transfer'});
  assert.equal(payload.payer.first_name,'APRO');assert.equal(payload.payer.last_name,'Teste');assert.equal(payload.payer.email,'test@testuser.com');
  assert.equal(cliente.nome,salvo);
 }
});

test('preços e volumes são do servidor; informações do cliente e cartões não alteram o total',()=>{
 const b=structuredClone(body);b.itens[0].preco=.01;b.itens[0].peso=1;
 const v=c.itensValidados(b);assert.equal(v.subtotal,1290);assert.equal(v.pacotes[0].gramas,50);
 const p={id:'abc',cliente:c.clienteValido(b.cliente,b.cep),itens:v.itens,total:2369,frete:{centavos:1079,transportadora:'JeT',servico:'Standard'}};
 const payload=c.payloadPagamento(p,{id:'pix',type:'bank_transfer'});assert.equal(payload.total_amount,'23.69');assert.equal(payload.shipment.address.zip_code,b.cep);assert.equal(payload.items[1].unit_price,'10.79');
});
test('frete indisponível ou alterado exige confirmação; zero é aceito',()=>{
 assert.throws(()=>c.conferirFrete([],1,10),{status:409});assert.throws(()=>c.conferirFrete([{id:'1',preco:12}],1,10),{status:409});assert.equal(c.conferirFrete([{id:'1',preco:0}],1,0).centavos,0);
});
test('não confirma pagamento com valor, vendedor, referência ou status incorretos',()=>{
 const p={id:'ref',vendedor:'123',total:2369};const d={id:'ORDTEST',user_id:123,country_code:'BRA',external_reference:'ref',total_amount:'23.69',total_paid_amount:'23.69',status:'processed',status_detail:'accredited',transactions:{payments:[{status:'processed',status_detail:'accredited'}]}};
 assert.equal(c.conferirPagamento(p,d).aprovado,true);
 for(const change of [{total_amount:'0.01'},{user_id:999},{external_reference:'outro'}])assert.throws(()=>c.conferirPagamento(p,{...d,...change}));
 for(const change of [{status:'processing'},{status_detail:'partially_refunded'},{total_paid_amount:'0.01'}])assert.equal(c.conferirPagamento(p,{...d,...change}).aprovado,false);
});
test('pedido persistente, token protegido, idempotência e status consultado no servidor',async()=>{
 const f=fixture();try{
 const p=await c.preparar(body);assert.equal(p.total,2369);assert.ok(p.token);assert.ok(!p.cliente&&!p.tokenHash);assert.ok(f.db.has(c.prefixo+p.id));
 await assert.rejects(()=>c.pagar(p.id,'f'.repeat(64),{metodo:'pix'}),{status:401});
 const pago=await c.pagar(p.id,p.token,{metodo:'pix'});assert.equal(pago.pagamento.aprovado,true);
 await c.pagar(p.id,p.token,{metodo:'pix'});assert.equal(f.orders,1);
 const criacao=f.requests.find(r=>r.url.endsWith('/v1/orders'));assert.equal(criacao.opts.headers['X-Idempotency-Key'],'heeeph-teste-'+p.id);
 assert.equal(JSON.parse(criacao.opts.body).transactions.payments[0].amount,'23.69');
 }finally{f.close();}
});
test('frete muda antes de pagar: nenhuma cobrança é criada',async()=>{
 const f=fixture();try{const p=await c.preparar(body);f.setPreco(11);await assert.rejects(()=>c.pagar(p.id,p.token,{metodo:'pix'}),{status:409});assert.equal(f.orders,0);}finally{f.close();}
});
test('conta real é bloqueada mesmo se a variável se chama TEST',async()=>{
 const f=fixture();try{f.setTest(false);await assert.rejects(()=>c.preparar(body),{status:503});assert.equal(f.orders,0);}finally{f.close();}
});
test('timeout não permite alterar a tentativa e criar outra cobrança',async()=>{
 const f=fixture();try{const p=await c.preparar(body);f.setTimeout(true);await assert.rejects(()=>c.pagar(p.id,p.token,{metodo:'pix'}));
 await assert.rejects(()=>c.pagar(p.id,p.token,{metodo:'cartao',tipo:'credit_card',formData:{payment_method_id:'visa',token:'novo',installments:1}}),{status:409});assert.equal(f.orders,1);
 assert.ok(![...f.db.values()].some(v=>String(v).includes('segredo-mp')));
 }finally{f.close();}
});
test('assinatura do webhook recusa falsificação e alteração de identificador',()=>{
 const id='ORDTEST',rid='req',ts='1742505638683',secret='segredo';const v=crypto.createHmac('sha256',secret).update(`id:${id};request-id:${rid};ts:${ts};`).digest('hex');
 const req={query:{'data.id':id},headers:{'x-request-id':rid,'x-signature':`ts=${ts},v1=${v}`}};
 assert.equal(assinaturaValida(req,secret),true);assert.equal(assinaturaValida(req,'outro'),false);req.query['data.id']='ORDOUTRO';assert.equal(assinaturaValida(req,secret),false);
});
test('endpoint desativado não revela segredo nem processa cobranças',async()=>{
 const f=fixture();try{process.env.CHECKOUT_TESTE_ATIVO='false';const handler=require('../api/checkout');const res={setHeader(){},status(s){this.code=s;return this;},json(d){this.data=d;return this;}};
 await handler({method:'POST',headers:{},body:{...body,acao:'preparar'}},res);assert.equal(res.code,503);assert.ok(!JSON.stringify(res.data).includes('segredo'));assert.equal(f.orders,0);
 }finally{f.close();}
});

test('resposta Orders sem user_id é conferida pela conta autenticada',async()=>{
 const f=fixture();try{f.setSemVendedor(true);const p=await c.preparar(body);const pg=await c.pagar(p.id,p.token,{metodo:'pix'});assert.equal(pg.pagamento.aprovado,true);}finally{f.close();}
});
test('recusa explícita libera formulário e nova tentativa usa outra chave',async()=>{
 const f=fixture();try{const p=await c.preparar(body);f.setRecusa(true);await assert.rejects(()=>c.pagar(p.id,p.token,{metodo:'pix'}));
 const status=await c.status(p.id,p.token);assert.equal(status.tentativa,false);assert.equal(status.ultimaFalha.codigo,'invalid_email_for_sandbox');
 f.setRecusa(false);await c.pagar(p.id,p.token,{metodo:'pix'});const posts=f.requests.filter(r=>r.url.endsWith('/v1/orders'));assert.notEqual(posts[0].opts.headers['X-Idempotency-Key'],posts[1].opts.headers['X-Idempotency-Key']);
 }finally{f.close();}
});
test('status recupera order criada mas não associada ao pedido local',async()=>{
 const f=fixture();try{const p=await c.preparar(body);await c.pagar(p.id,p.token,{metodo:'pix'});
 const local=JSON.parse(f.db.get(c.prefixo+p.id));delete local.pagamento;delete local.mpRecuperacao;f.db.set(c.prefixo+p.id,JSON.stringify(local));
 const status=await c.status(p.id,p.token);assert.equal(status.pagamento.aprovado,true);assert.equal(f.orders,1);
 }finally{f.close();}
});
test('busca vazia após timeout mantém bloqueio; recuperação Pix reutiliza chave e payload',async()=>{
 const f=fixture();try{const p=await c.preparar(body);f.setTimeout(true);await assert.rejects(()=>c.pagar(p.id,p.token,{metodo:'pix'}));
 const status=await c.status(p.id,p.token);assert.equal(status.tentativa,true);assert.equal(status.recuperarPix,true);
 f.setTimeout(false);const pg=await c.recuperarPix(p.id,p.token);assert.equal(pg.pagamento.aprovado,true);
 const posts=f.requests.filter(r=>r.url.endsWith('/v1/orders'));assert.equal(posts[0].opts.body,posts[1].opts.body);assert.equal(posts[0].opts.headers['X-Idempotency-Key'],posts[1].opts.headers['X-Idempotency-Key']);
 }finally{f.close();}
});
test('e-mail real é recusado antes de criar um pagamento',()=>{
 assert.throws(()=>c.clienteValido({...body.cliente,email:'comprador@example.com'},body.cep),/@testuser.com/);
});

test('preparação recupera a mesma identidade após perder a resposta e recusa alteração do pedido',async()=>{
 const f=fixture();try{
  const a=await c.preparar(body),b=await c.preparar(structuredClone(body));
  assert.equal(a.id,b.id);assert.equal(a.token,b.token);assert.equal(f.orders,0);
  await assert.rejects(()=>c.preparar({...body,frete:1}),{status:409});
  await assert.rejects(()=>c.preparar({...body,chavePreparacao:'curta'}),{status:400});
 }finally{f.close();}
});

test('duas chamadas simultâneas criam somente uma cobrança',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body);
  const resultados=await Promise.allSettled([c.pagar(p.id,p.token,{metodo:'pix'}),c.pagar(p.id,p.token,{metodo:'pix'})]);
  assert.equal(resultados.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(resultados.find(r=>r.status==='rejected').reason.status,409);assert.equal(f.orders,1);
  assert.equal((await c.status(p.id,p.token)).pagamento.aprovado,true);
 }finally{f.close();}
});

test('bloqueio de outro processo não é removido nem inicia cobrança',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body),key=c.prefixo+'lock:'+p.id;f.db.set(key,'outro-processo');
  await assert.rejects(()=>c.pagar(p.id,p.token,{metodo:'pix'}),{status:409});
  assert.equal(f.db.get(key),'outro-processo');assert.equal(f.orders,0);
 }finally{f.close();}
});

test('Pix incerto antigo não é reenviado automaticamente',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body);f.setTimeout(true);await assert.rejects(()=>c.pagar(p.id,p.token,{metodo:'pix'}));
  const raw=JSON.parse(f.db.get(c.prefixo+p.id));raw.criadoEm=new Date(Date.now()-31*60000).toISOString();f.db.set(c.prefixo+p.id,JSON.stringify(raw));
  await assert.rejects(()=>c.recuperarPix(p.id,p.token),{status:409});assert.equal(f.orders,1);
 }finally{f.close();}
});

test('webhook exige assinatura e consulta a API; repetir evento não cria cobrança',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body);await c.pagar(p.id,p.token,{metodo:'pix'});
  process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST='segredo-assinatura';
  const handler=require('../api/mercado-pago-webhook'),id='ORDTEST',rid='req',ts='1742505638683';
  const sign=crypto.createHmac('sha256','segredo-assinatura').update(`id:${id};request-id:${rid};ts:${ts};`).digest('hex');
  const req={method:'POST',query:{'data.id':id},headers:{'x-request-id':rid,'x-signature':`ts=${ts},v1=${sign}`},body:{data:{status:'processed',total_amount:'.01'}}};
  const call=async(r)=>{const res={setHeader(){},status(s){this.code=s;return this;},end(){return this;}};await handler(r,res);return res.code;};
  assert.equal(await call({...req,headers:{}}),401);
  assert.equal(JSON.parse(f.db.get(c.prefixo+p.id)).webhookRecebido,undefined);
  assert.equal(await call(req),200);assert.equal(await call(req),200);assert.equal(f.orders,1);
  const evidencia=JSON.parse(f.db.get(c.prefixo+p.id)).webhookRecebido;
  assert.equal(evidencia.assinaturaValidada,true);assert.equal(evidencia.mpId,id);assert.ok(evidencia.em);assert.equal(evidencia.status,'processed');
  assert.equal((await c.status(p.id,p.token)).pagamento.aprovado,true);
  const local=JSON.parse(f.db.get(c.prefixo+p.id));local.pagamento.mpId='ORDOUTRO';f.db.set(c.prefixo+p.id,JSON.stringify(local));
  assert.equal(await call(req),503);
 }finally{f.close();}
});

test('produção desativada, sem credenciais próprias ou em Preview não cria cobrança',async()=>{
 const f=fixture();try{
  process.env.CHECKOUT_AMBIENTE='producao';
  await assert.rejects(()=>c.configurado(),{status:503});
  process.env.CHECKOUT_PRODUCAO_ATIVO='true';
  await assert.rejects(()=>c.configurado(),{status:503});
  Object.assign(process.env,{MERCADO_PAGO_PUBLIC_KEY_PROD:'public-prod',MERCADO_PAGO_ACCESS_TOKEN_PROD:'token-prod',MERCADO_PAGO_WEBHOOK_SECRET_PROD:'secret-prod',MERCADO_PAGO_VENDEDOR_ID_PROD:'123',UPSTASH_REDIS_REST_URL_PROD:'https://redis.test',UPSTASH_REDIS_REST_TOKEN_PROD:'db-prod',VERCEL_ENV:'preview'});
  await assert.rejects(()=>c.configurado(),{status:503});assert.equal(f.orders,0);
  process.env.VERCEL_ENV='production';await assert.rejects(()=>c.configurado(),{status:503}); // conta de teste
  f.setTest(false);assert.equal(await c.configurado(),'123');
  process.env.MERCADO_PAGO_VENDEDOR_ID_PROD='999';await assert.rejects(()=>c.configurado(),{status:503});
 }finally{f.close();}
});

test('produção usa namespace, credenciais e retenção próprios; recusa CPF inválido',async()=>{
 const f=fixture();try{
  const teste=await c.preparar(body);
  Object.assign(process.env,{CHECKOUT_AMBIENTE:'producao',CHECKOUT_PRODUCAO_ATIVO:'true',MERCADO_PAGO_PUBLIC_KEY_PROD:'public-prod',MERCADO_PAGO_ACCESS_TOKEN_PROD:'token-prod',MERCADO_PAGO_WEBHOOK_SECRET_PROD:'secret-prod',MERCADO_PAGO_VENDEDOR_ID_PROD:'123',UPSTASH_REDIS_REST_URL_PROD:'https://redis.test',UPSTASH_REDIS_REST_TOKEN_PROD:'db-prod',VERCEL_ENV:'production'});f.setTest(false);
  await assert.rejects(()=>c.buscar(teste.id),{status:404});
  const b=structuredClone(body);b.cliente.email='cliente@example.com';b.cliente.cpf='52998224725';
  const p=await c.preparar(b);assert.notEqual(p.id,teste.id);assert.equal(p.teste,false);assert.equal(p.publicKey,'public-prod');
  assert.equal(c.prefixo,'heeeph:producao:');assert.deepEqual(c.expiracao(),[]);
  const grava=f.requests.filter(r=>r.url==='https://redis.test').map(r=>JSON.parse(r.opts.body)).find(cmd=>cmd[0]==='SET'&&cmd[1]===c.prefixo+p.id);
  assert.equal(grava.includes('EX'),false);assert.ok(f.db.has('heeeph:teste:'+teste.id));
  assert.equal(f.requests.filter(r=>r.url.endsWith('/users/me')).at(-1).opts.headers.Authorization,'Bearer token-prod');
  assert.throws(()=>c.clienteValido({...b.cliente,cpf:'11111111111'},b.cep),/CPF/);
  assert.throws(()=>c.clienteValido({...b.cliente,cpf:'52998224726'},b.cep),/CPF/);
 }finally{f.close();}
});

test('pedido ou pagamento de outro ambiente/identificador não é aceito',()=>{
 const p={id:'ref',vendedor:'123',total:100,ambiente:'producao'};
 assert.throws(()=>c.conferirPagamento(p,{id:'ORDTEST'}),{status:409});
 assert.throws(()=>c.conferirPagamento({...p,ambiente:'teste',mpRecuperacao:'ORDORIGINAL'},{id:'ORDOUTRO'}),{status:409});
});

test('aprovação de produção exige os valores da transação e não aceita arredondar centavos incorretos',()=>{
 const env={...process.env};try{
  process.env.CHECKOUT_AMBIENTE='producao';
  const p={id:'ref',ambiente:'producao',total:100,vendedor:'123'};
  const payment={status:'processed',status_detail:'accredited',amount:'1.00',paid_amount:'1.00'};
  const d={id:'ORDTEST',external_reference:p.id,user_id:123,country_code:'BRA',total_amount:'1.00',total_paid_amount:'1.00',status:'processed',status_detail:'accredited',transactions:{payments:[payment]}};
  assert.equal(c.conferirPagamento(p,d).aprovado,true);
  for(const value of [undefined,'0.01','NaN','1.004'])assert.equal(c.conferirPagamento(p,{...d,transactions:{payments:[{...payment,paid_amount:value}]}}).aprovado,false);
 }finally{process.env=env;}
});

test('desativar novas cobranças preserva consulta e reconciliação dos pagamentos existentes',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body);await c.pagar(p.id,p.token,{metodo:'pix'});
  process.env.CHECKOUT_TESTE_ATIVO='false';
  assert.equal((await c.status(p.id,p.token)).pagamento.aprovado,true);
  await c.notificar('ORDTEST');
  await assert.rejects(()=>c.preparar({...body,chavePreparacao:'d'.repeat(64)}),{status:503});assert.equal(f.orders,1);
 }finally{f.close();}
});


test('consulta preserva motivo da transação e Pix sem copiar dados extras nem criar cobrança',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body);await c.pagar(p.id,p.token,{metodo:'pix'});
  const order=await c.mp('/v1/orders/ORDTEST');
  Object.assign(order,{status:'failed',status_detail:'failed',total_paid_amount:'0.00'});
  Object.assign(order.transactions.payments[0],{status:'failed',status_detail:'rejected_by_issuer',secret:'nao-expor',payment_method:{id:'pix',qr_code:'',qr_code_base64:''}});
  const r=await c.status(p.id,p.token);
  assert.deepEqual(r.pagamento.transacoes,[{status:'failed',detalhe:'rejected_by_issuer',metodo:'pix'}]);
  assert.equal(r.pagamento.aprovado,false);assert.equal(r.pagamento.pix.codigo,'');assert.equal(f.orders,1);
  assert.ok(!JSON.stringify(r).includes('nao-expor'));
 }finally{f.close();}
});
