const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../lib/checkout'),r=require('../lib/checkout-recuperacao'),handler=require('../api/pedidos');
function fixture(){
 const env={...process.env},originais={},nomes=['exclusivo','buscar','atualizarSemBloqueioRecuperacao','salvar','redis'],db=new Map(),comandos=[],salvos=[];
 for(const nome of nomes)originais[nome]=c[nome];
 Object.assign(process.env,{CHECKOUT_AMBIENTE:'teste',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/preparacao-vendas',HEEEPH_PEDIDOS_ADMIN_TOKEN:'a'.repeat(32)});
 const original='f'.repeat(64),p={id:r.ID,ambiente:'teste',tokenHash:c.hash(original),criadoEm:new Date().toISOString(),itens:[],pagamento:{pixExpiradoConfirmado:true,aprovado:false,impedimentoEncerramento:false}};
 let consultas=0,agora=Date.now();const relogio=Date.now;Date.now=()=>agora;
 c.exclusivo=async(id,fn)=>fn();c.buscar=async id=>{assert.equal(id,r.ID);return structuredClone(p);};
 c.atualizarSemBloqueioRecuperacao=async pedido=>{consultas++;return pedido;};
 c.salvar=async pedido=>{salvos.push(structuredClone(pedido));};
 c.redis=async a=>{
  comandos.push(a);
  if(a[0]==='GET')return db.get(a[1])??null;
  if(a[0]==='SET'){if(a.includes('NX')&&db.has(a[1]))return null;db.set(a[1],a[2]);return 'OK';}
  if(a[0]==='EVAL'){if(db.get(a[3])!==a[4])return 0;db.delete(a[3]);return 1;}
  throw Error('Comando inesperado');
 };
 return {p,db,comandos,salvos,original,avancar:ms=>agora+=ms,get consultas(){return consultas;},close(){Object.assign(c,originais);process.env=env;Date.now=relogio;}};
}
test('emissão exige autenticação administrativa e confirmação exata do pedido',async()=>{
 const f=fixture();try{
  const chamar=async(authorization,confirmacao)=>{const res={setHeader(){},status(s){this.code=s;return this;},json(d){this.data=d;return this;}};await handler({method:'POST',headers:{authorization},body:{acao:'recuperarCheckoutTeste',id:r.ID,confirmacao}},res);return res;};
  assert.equal((await chamar('',r.ID)).code,401);assert.equal(f.db.size,0);
  assert.equal((await chamar('Bearer '+'a'.repeat(32),'outro')).code,400);assert.equal(f.db.size,0);
  const res=await chamar('Bearer '+'a'.repeat(32),r.ID);assert.match(res.data.acessoTemporario,/^[a-f0-9]{64}$/);assert.equal(f.consultas,1);
 }finally{f.close();}
});
test('link tem uso único, sessão separada e prazo total de no máximo cinco minutos',async()=>{
 const f=fixture();try{
  const link=await r.emitir(r.ID);f.avancar(120000);const sessao=await r.resgatar(link.acessoTemporario);
  assert.notEqual(sessao.token,link.acessoTemporario);assert.equal(sessao.expiraEm,link.expiraEm);assert.equal(sessao.recuperacaoTeste,true);
  const set=f.comandos.filter(a=>a[0]==='SET');assert.equal(set[0].at(-1),300);assert.equal(set[1].at(-1),180);
  await assert.rejects(()=>r.resgatar(link.acessoTemporario));
  assert.equal(f.salvos.every(p=>p.tokenHash===c.hash(f.original)),true);
  const gravado=JSON.stringify([...f.db.entries(),...f.salvos]);assert.equal(gravado.includes(sessao.token),false);assert.equal(gravado.includes(link.acessoTemporario),false);
  const acesso=await r.autorizar(f.p,sessao.token,'desistir');await r.invalidar(acesso);await assert.rejects(()=>r.autorizar(f.p,sessao.token,'status'));
 }finally{f.close();}
});
test('capacidade limitada recusa pagamento, recuperação Pix, alteração e outros pedidos',async()=>{
 const f=fixture();try{const link=await r.emitir(r.ID),sessao=await r.resgatar(link.acessoTemporario);
  for(const acao of ['pagar','preparar','recuperarPix','alterar','liberarNovaCompra'])await assert.rejects(()=>r.autorizar(f.p,sessao.token,acao));
  await assert.rejects(()=>r.autorizar({...f.p,id:'a'.repeat(32)},sessao.token,'status'));
  assert.throws(()=>c.autenticar(f.p,sessao.token),/não autorizado/);c.autenticar(f.p,f.original);
 }finally{f.close();}
});
test('produção, ambiente errado e outra branch não emitem acesso',async()=>{
 for(const mudar of [()=>process.env.VERCEL_ENV='production',()=>process.env.CHECKOUT_AMBIENTE='producao',()=>process.env.VERCEL_GIT_COMMIT_REF='main']){
  const f=fixture();try{mudar();await assert.rejects(()=>r.emitir(r.ID));assert.equal(f.db.size,0);assert.equal(f.consultas,0);}finally{f.close();}
 }
});
test('pendência, aprovação, recebimento ou expiração não comprovada impedem emissão e resgate',async()=>{
 for(const pg of [{pixExpiradoConfirmado:false},{pixExpiradoConfirmado:true,aprovado:true},{pixExpiradoConfirmado:true,impedimentoEncerramento:true}]){
  const f=fixture();try{
   const link=await r.emitir(r.ID);Object.assign(f.p.pagamento,pg);
   await assert.rejects(()=>r.emitir(r.ID));await assert.rejects(()=>r.resgatar(link.acessoTemporario));
   assert.equal([...f.db.keys()].some(k=>k.includes(':sessao:')),false);
  }finally{f.close();}
 }
});
test('acessos expirados e resgates concorrentes não reutilizam o link',async()=>{
 const f=fixture();try{const link=await r.emitir(r.ID);f.avancar(300001);await assert.rejects(()=>r.resgatar(link.acessoTemporario));}finally{f.close();}
 const g=fixture();try{const link=await r.emitir(r.ID);const resultados=await Promise.allSettled([r.resgatar(link.acessoTemporario),r.resgatar(link.acessoTemporario)]);assert.equal(resultados.filter(x=>x.status==='fulfilled').length,1);
  const sessao=resultados.find(x=>x.status==='fulfilled').value;g.avancar(300001);await assert.rejects(()=>r.autorizar(g.p,sessao.token,'status'));
 }finally{g.close();}
});
test('integração simulada: capacidade passa pelo checkout real só para status e desistência, sem POST financeiro',async()=>{
 const env={...process.env},fetchOriginal=global.fetch,db=new Map(),requisicoes=[];
 Object.assign(process.env,{CHECKOUT_AMBIENTE:'teste',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/preparacao-vendas',MERCADO_PAGO_ACCESS_TOKEN_TEST:'ficticio',MERCADO_PAGO_PUBLIC_KEY_TEST:'ficticia',UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'ficticio'});
 const tokenOriginal='f'.repeat(64),p={id:r.ID,ambiente:'teste',vendedor:'123',criadoEm:new Date().toISOString(),tokenHash:c.hash(tokenOriginal),total:100,itens:[],pacotes:[],frete:{centavos:0},saida:{confirmada:true,motivo:'alterar'},pagamento:{mpId:'ORDTSTRECUPERACAO'}};
 db.set(c.prefixo+p.id,JSON.stringify(p));
 global.fetch=async(url,opts={})=>{
  requisicoes.push({url,method:opts.method||'GET'});const json=d=>({ok:true,status:200,json:async()=>d});
  if(url==='https://redis.test'){
   const a=JSON.parse(opts.body);let result;
   if(a[0]==='GET')result=db.get(a[1])||null;
   else if(a[0]==='SET'){result=a.includes('NX')&&db.has(a[1])?null:'OK';if(result)db.set(a[1],a[2]);}
   else if(a[0]==='EVAL'&&a[2]===2){db.set(a[3],a[5]);result='OK';}
   else if(a[0]==='EVAL'){result=db.get(a[3])===a[4]?Number(db.delete(a[3])):0;}
   else throw Error('Comando inesperado');return json({result});
  }
  if(opts.method&&opts.method!=='GET')throw Error('Operação financeira inesperada');
  if(url.endsWith('/users/me'))return json({id:123,tags:['test_user']});
  if(url.endsWith('/v1/orders/ORDTSTRECUPERACAO'))return json({id:'ORDTSTRECUPERACAO',external_reference:p.id,user_id:123,country_code:'BRA',total_amount:'1.00',total_paid_amount:'1.00',status:'canceled',status_detail:'expired',transactions:{payments:[{amount:'1.00',status:'expired',status_detail:'expired',payment_method:{id:'pix'}}]}});
  throw Error('Acesso inesperado');
 };
 try{
  const link=await r.emitir(p.id),sessao=await r.resgatar(link.acessoTemporario);
  assert.equal((await c.status(p.id,sessao.token)).recuperacaoTeste,true);
  await assert.rejects(()=>c.pagar(p.id,sessao.token,{metodo:'pix'}),/não autorizado/);
  await assert.rejects(()=>c.recuperarPix(p.id,sessao.token),/não autorizado/);
  await assert.rejects(()=>c.abandonarPedido(p.id,sessao.token,{motivo:'alterar',confirmado:true}),/sem permissão/);
  const fim=await c.abandonarPedido(p.id,sessao.token,{motivo:'desistir',confirmado:true});assert.equal(fim.edicaoLiberada,true);
  const salvo=JSON.parse(db.get(c.prefixo+p.id));assert.equal(salvo.tokenHash,p.tokenHash);assert.equal(salvo.saida.motivo,'desistir');assert.equal(salvo.saida.confirmada,true);
  assert.deepEqual(salvo.recuperacaoCheckoutHistorico.map(e=>e.acao),['emitido','resgatado','desistencia_concluida']);
  await assert.rejects(()=>c.status(p.id,sessao.token));assert.equal(requisicoes.some(q=>q.url.includes('api.mercadopago')&&q.method==='POST'),false);
 }finally{process.env=env;global.fetch=fetchOriginal;}
});
