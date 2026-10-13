const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const c=require('../lib/checkout'),{assinaturaValida}=require('../lib/webhook');
const body={cep:'30220060',itens:[{id:'games-free-fire',medida:'10x15cm',quantidade:1}],servico:'1',frete:10.79,cliente:{nome:'Comprador Teste',email:'teste@testuser.com',cpf:'19119119100',telefone:'11987654321',termos:true,endereco:{rua:'Rua Teste',numero:'10',bairro:'Centro',cidade:'Belo Horizonte',uf:'MG',complemento:''}}};
function fixture(){
 const db=new Map(),requests=[];const previous=global.fetch;const env={...process.env};
 Object.assign(process.env,{CHECKOUT_TESTE_ATIVO:'true',MERCADO_PAGO_ACCESS_TOKEN_TEST:'segredo-mp',MERCADO_PAGO_PUBLIC_KEY_TEST:'public-test',UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'segredo-db',FRETE_ATIVO:'true',MELHOR_ENVIO_AMBIENTE:'producao',MELHOR_ENVIO_TOKEN:'segredo-frete',MELHOR_ENVIO_USER_AGENT:'HEEEPH'});
 let preco=10.79,testUser=true,orders=0,timeout=false,lastOrder;
 global.fetch=async(url,opts={})=>{
  requests.push({url,opts});const json=d=>({ok:true,json:async()=>d});
  if(url==='https://redis.test'){
   const [cmd,key,value,...args]=JSON.parse(opts.body);let result;
   if(cmd==='SET'){if(args.includes('NX')&&db.has(key))result=null;else{db.set(key,value);result='OK';}}
   else if(cmd==='GET')result=db.get(key)||null;else if(cmd==='ZADD')result=1;else throw Error(cmd);
   return json({result});
  }
  if(url.endsWith('/users/me'))return json({id:123,tags:testUser?['test_user']:[]});
  if(url.includes('melhorenvio'))return json([{id:1,company:{name:'JeT'},name:'Standard',price:preco,delivery_time:4}]);
  if(url.endsWith('/v1/orders')){orders++;if(timeout)throw new Error('timeout');const payload=JSON.parse(opts.body);lastOrder={id:'ORDTEST',user_id:123,country_code:'BRA',external_reference:payload.external_reference,total_amount:payload.total_amount,total_paid_amount:payload.total_amount,status:'processed',status_detail:'accredited',transactions:{payments:[{status:'processed',status_detail:'accredited',payment_method:{id:'pix'}}]}};return json(lastOrder);}
  if(url.endsWith('/v1/orders/ORDTEST'))return json(lastOrder);throw Error(url);
 };
 return{requests,db,setPreco:v=>preco=v,setTest:v=>testUser=v,setTimeout:v=>timeout=v,get orders(){return orders;},close(){global.fetch=previous;process.env=env;}};
}
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
