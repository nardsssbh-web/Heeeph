const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../lib/checkout');
const body={chavePreparacao:'9'.repeat(64),cep:'30220060',itens:[{id:'games-free-fire',medida:'20x28cm',quantidade:2},{id:'games-free-fire',medida:'10x15cm',quantidade:4}],servico:'1',frete:14.36,
 cliente:{nome:'Cliente Fictício',email:'test@testuser.com',cpf:'19119119100',telefone:'11999999999',termos:true,endereco:{rua:'Rua Local',numero:'123',complemento:'Apto 2',bairro:'Centro',cidade:'Belo Horizonte',uf:'MG'}}};
function fixture(){
 const env={...process.env},fetch=global.fetch,db=new Map(),cotacoes=[],requests=[];let price='14.36',modo='normal',order;
 Object.assign(process.env,{CHECKOUT_AMBIENTE:'teste',CHECKOUT_TESTE_ATIVO:'true',MERCADO_PAGO_ACCESS_TOKEN_TEST:'ficticio',MERCADO_PAGO_PUBLIC_KEY_TEST:'ficticia',UPSTASH_REDIS_REST_URL:'https://redis.envio.test',UPSTASH_REDIS_REST_TOKEN:'ficticio',FRETE_ATIVO:'true',MELHOR_ENVIO_AMBIENTE:'producao',MELHOR_ENVIO_TOKEN:'ficticio',MELHOR_ENVIO_USER_AGENT:'HEEEPH local'});
 global.fetch=async(url,opts={})=>{
  requests.push({url,opts});const json=d=>({ok:true,status:200,json:async()=>structuredClone(d)});
  if(url==='https://redis.envio.test'){
   const a=JSON.parse(opts.body);let result;
   if(a[0]==='GET')result=db.get(a[1])||null;
   else if(a[0]==='SET'){result=a.includes('NX')&&db.has(a[1])?null:'OK';if(result)db.set(a[1],a[2]);}
   else if(a[0]==='EVAL'&&a[2]===2){db.set(a[3],a[5]);result='OK';}
   else if(a[0]==='EVAL')result=db.get(a[3])===a[4]?Number(db.delete(a[3])):0;
   else throw Error('Redis inesperado');return json({result});
  }
  if(url==='https://api.mercadopago.com/users/me'){assert.equal(opts.method,'GET');return json({id:123,tags:['test_user']});}
  if(url.startsWith('https://viacep.com.br/ws/30220060/'))return json({cep:'30220-060',logradouro:'Rua Local',bairro:'Centro',localidade:'Belo Horizonte',uf:'MG'});
  if(url==='https://melhorenvio.com.br/api/v2/me/shipment/calculate'){
   cotacoes.push(JSON.parse(opts.body));if(modo==='json')return {ok:true,json:async()=>{throw SyntaxError('erro-local');}};
   return json(modo==='indisponivel'?[]:[{id:1,name:'Standard',company:{name:'Transportadora'},price}]);
  }
  if(url==='https://api.mercadopago.com/v1/orders/ORDENVIO'){assert.equal(opts.method,'GET');return json(order);}
  throw Error('Proibido criar cobrança, comprar frete ou emitir etiqueta: '+url);
 };
 return {db,cotacoes,requests,set price(v){price=v;},set modo(v){modo=v;},set order(v){order=v;},close(){global.fetch=fetch;process.env=env;}};
}
test('pedido preparado e aprovação simulada preservam destinatário, modalidade, seguro, volumes e frete',async()=>{
 const f=fixture();try{
  const p=await c.preparar(body);assert.equal(p.total,11576);assert.equal(p.subtotal,10140);assert.equal(p.frete.centavos,1436);
  assert.deepEqual(f.cotacoes[0].volumes,[{width:25,length:30,height:3,weight:0.49,insurance:101.4}]);
  const salvo=JSON.parse(f.db.get(c.prefixo+p.id));assert.equal(salvo.cliente.endereco.complement,'Apto 2');assert.equal(salvo.cliente.endereco.street_number,'123');assert.equal(salvo.cliente.endereco.zip_code,body.cep);
  salvo.pagamento={mpId:'ORDENVIO'};f.db.set(c.prefixo+p.id,JSON.stringify(salvo));
  f.order={id:'ORDENVIO',external_reference:p.id,user_id:123,country_code:'BRA',total_amount:'115.76',total_paid_amount:'115.76',status:'processed',status_detail:'accredited',transactions:{payments:[{amount:'115.76',paid_amount:'115.76',status:'processed',status_detail:'accredited',payment_method:{id:'pix'}}]}};
  const confirmado=await c.status(p.id,p.token);assert.equal(confirmado.pagamento.aprovado,true);
  const depois=JSON.parse(f.db.get(c.prefixo+p.id));for(const k of ['cliente','itens','frete','pacotes','cotacao','total','subtotal'])assert.deepEqual(depois[k],salvo[k]);
  await c.status(p.id,p.token);assert.equal(f.cotacoes.length,1);
  assert.equal(f.requests.some(r=>/cart|checkout|generate|print/.test(r.url)),false);
 }finally{f.close();}
});
test('cotação vencida/alterada ou serviço indisponível bloqueia pagamento e conserva pedido original',async()=>{
 for(const modo of ['preco','indisponivel','json']){
  const f=fixture();try{const p=await c.preparar(body);const original=JSON.parse(f.db.get(c.prefixo+p.id));
   if(modo==='preco')f.price='20.00';else f.modo=modo;
   await assert.rejects(()=>c.pagar(p.id,p.token,{metodo:'pix'}),{status:modo==='json'?502:409});
   assert.deepEqual(JSON.parse(f.db.get(c.prefixo+p.id)),original);assert.equal(f.cotacoes.length,2);
   assert.equal(f.db.has(c.prefixo+'tentativa:'+p.id),false);
   assert.equal(f.requests.some(r=>r.url==='https://api.mercadopago.com/v1/orders'),false);
  }finally{f.close();}
 }
});
