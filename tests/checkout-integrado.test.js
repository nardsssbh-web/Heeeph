const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const checkout=require('../api/checkout'),frete=require('../api/frete'),cep=require('../api/cep'),webhook=require('../api/mercado-pago-webhook'),c=require('../lib/checkout');
const resposta=()=>({code:200,setHeader(){},status(n){this.code=n;return this;},json(d){this.data=d;return this;},end(){return this;}});
test('jornada integrada pelas APIs reais com provedores locais: Pix, cartão 3DS e resposta perdida sem duplicação',async()=>{
 for(const modo of ['pix','cartao','pix-timeout']){
  const env={...process.env},fetch=global.fetch,db=new Map();let order,criacoes=0,consultasFrete=0;
  Object.assign(process.env,{CHECKOUT_AMBIENTE:'teste',CHECKOUT_TESTE_ATIVO:'true',CHECKOUT_3DS_ATIVO:'true',VERCEL_ENV:'preview',VERCEL_URL:'integracao-local.vercel.app',VERCEL_GIT_COMMIT_REF:'codex/preparacao-vendas',MERCADO_PAGO_ACCESS_TOKEN_TEST:'local',MERCADO_PAGO_PUBLIC_KEY_TEST:'local',MERCADO_PAGO_WEBHOOK_SECRET_TEST:'segredo-local',UPSTASH_REDIS_REST_URL:'https://redis.integrado.test',UPSTASH_REDIS_REST_TOKEN:'local',FRETE_ATIVO:'true',MELHOR_ENVIO_AMBIENTE:'producao',MELHOR_ENVIO_TOKEN:'local',MELHOR_ENVIO_USER_AGENT:'local'});
  global.fetch=async(url,opts={})=>{
   const json=d=>({ok:true,status:200,json:async()=>structuredClone(d)});
   if(url==='https://redis.integrado.test'){
    const a=JSON.parse(opts.body);let result;
    if(a[0]==='GET')result=db.get(a[1])||null;
    else if(a[0]==='SET'){result=a.includes('NX')&&db.has(a[1])?null:'OK';if(result)db.set(a[1],a[2]);}
    else if(a[0]==='EVAL'&&a[2]===2){db.set(a[3],a[5]);result='OK';}
    else if(a[0]==='EVAL')result=db.get(a[3])===a[4]?Number(db.delete(a[3])):0;
    else throw Error('Redis não simulado');return json({result});
   }
   if(url==='https://api.mercadopago.com/users/me')return json({id:123,tags:['test_user']});
   if(url==='https://viacep.com.br/ws/30220060/json/')return json({cep:'30220-060',logradouro:'Rua Local',bairro:'Centro',localidade:'Belo Horizonte',uf:'MG'});
   if(url==='https://melhorenvio.com.br/api/v2/me/shipment/calculate'){consultasFrete++;const b=JSON.parse(opts.body);assert.equal(b.volumes[0].weight,0.18);assert.equal(b.volumes[0].insurance,24.9);return json([{id:1,name:'Standard',company:{name:'Local'},price:'14.36'}]);}
   if(url==='https://api.mercadopago.com/v1/orders'&&opts.method==='POST'){
    criacoes++;const b=JSON.parse(opts.body);assert.equal(b.total_amount,'39.26');assert.equal(b.items.at(-1).unit_price,'14.36');assert.equal(b.shipment.address.complement,'Apto 2');
    const cartao=modo==='cartao';order={id:'ORDINTEGRADO',external_reference:b.external_reference,user_id:123,country_code:'BRA',total_amount:b.total_amount,total_paid_amount:'39.26',status:'action_required',status_detail:cartao?'pending_challenge':'waiting_transfer',transactions:{payments:[{amount:'39.26',status:'action_required',status_detail:cartao?'pending_challenge':'waiting_transfer',payment_method:cartao?{id:'master',transaction_security:{url:'https://www.mercadopago.com.br/auth/card/validation/pages/remedies/local'}}:{id:'pix',qr_code:'CODIGO_FICTICIO_LOCAL'}}]}};
    if(cartao)assert.equal(b.config.online.transaction_security.liability_shift,'required');
    if(modo==='pix-timeout')throw Error('Resposta simulada perdida após criação');return json(order);
   }
   if(url.startsWith('https://api.mercadopago.com/v1/orders?'))return json({data:order?[order]:[]});
   if(url==='https://api.mercadopago.com/v1/orders/ORDINTEGRADO'&&opts.method==='GET')return json(order);
   throw Error('Serviço externo/ação não permitida na simulação: '+url);
  };
  const call=async(body,token,origin='https://integracao-local.vercel.app')=>{const r=resposta();await checkout({method:'POST',headers:{origin,...(token?{authorization:'Bearer '+token}:{})},body},r);return r;};
  try{
   const itens=[{id:'games-free-fire',medida:'20x28cm',quantidade:1,preco:0.01,weight:0.001}];
   const q=resposta();await frete({method:'POST',body:{cep:'30220060',itens}},q);assert.equal(q.code,200);assert.equal(q.data.opcoes[0].preco,14.36);
   const end=resposta();await cep({method:'GET',query:{cep:'30220060'}},end);assert.equal(end.code,200);
   const body={acao:'preparar',chavePreparacao:'c'.repeat(64),cep:'30220060',itens,servico:'1',frete:q.data.opcoes[0].preco,cliente:{nome:'Cliente Local',email:'test@testuser.com',cpf:'19119119100',telefone:'11999999999',termos:true,endereco:{rua:end.data.rua,numero:'123',complemento:'Apto 2',bairro:end.data.bairro,cidade:end.data.cidade,uf:end.data.uf}}};
   assert.equal((await call(body,null,'https://externo.invalid')).code,403);
   assert.equal((await call({...body,frete:0})).code,409);assert.equal(criacoes,0);
   const p=(await call(body)).data;assert.equal(p.total,3926);assert.equal((await call(body)).data.id,p.id);
   const dadosOriginais=JSON.parse(db.get(c.prefixo+p.id));
   const pagar={acao:'pagar',id:p.id,metodo:modo==='cartao'?'cartao':'pix',...(modo==='cartao'?{tipo:'credit_card',formData:{token:'token-ficticio-nao-persistir',payment_method_id:'master',installments:1}}:{})};
   assert.equal((await call(pagar,'errado')).code,401);const pagamento=await call(pagar,p.token);
   assert.equal(pagamento.code,modo==='pix-timeout'?502:200);assert.equal(criacoes,1);
   const retomado=await call({acao:'status',id:p.id},p.token);assert.equal(retomado.data.id,p.id);assert.equal(retomado.data.pagamento.aprovado,false);
   assert.equal(retomado.data.pagamento.mpId,'ORDINTEGRADO');assert.equal(retomado.data.total,3926);
   await call(pagar,p.token);assert.equal(criacoes,1);
   if(modo==='cartao')assert.equal(retomado.data.pagamento.autenticacao.necessaria,true);
   Object.assign(order,{status:'processed',status_detail:'accredited'});Object.assign(order.transactions.payments[0],{status:'processed',status_detail:'accredited',paid_amount:'39.26'});
   const ts='1792760000000',rid='integracao-local',v1=crypto.createHmac('sha256','segredo-local').update(`id:ordintegrado;request-id:${rid};ts:${ts};`).digest('hex');
   for(let i=0;i<2;i++){const r=resposta();await webhook({method:'POST',query:{'data.id':'ORDINTEGRADO'},headers:{'x-request-id':rid,'x-signature':`ts=${ts},v1=${v1}`},body:{status:'failed',amount:0.01}},r);assert.equal(r.code,200);}
   const final=await call({acao:'status',id:p.id},p.token);assert.equal(final.data.pagamento.aprovado,true);assert.equal(final.data.total,3926);assert.equal(criacoes,1);
   const salvo=JSON.parse(db.get(c.prefixo+p.id));for(const k of ['cliente','itens','frete','pacotes','subtotal','total'])assert.deepEqual(salvo[k],dadosOriginais[k]);
   assert.equal(JSON.stringify(salvo).includes('token-ficticio-nao-persistir'),false);assert.ok(consultasFrete>=3);
   assert.equal([...db.keys()].filter(k=>/^heeeph:teste:[a-f0-9]{32}$/.test(k)).length,1);
   assert.equal((await call({acao:'abandonarPedido',id:p.id,motivo:'desistir',confirmado:true},p.token)).code,409);
  }finally{global.fetch=fetch;process.env=env;}
 }
});
