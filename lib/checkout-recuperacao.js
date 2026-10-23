const crypto=require('node:crypto');
const ID='83891a67a9028883fed00b55b64db215',TIPO='checkout-expirado-preview-v1';
const checkout=()=>require('./checkout');
function falhar(mensagem,status=403){throw new (checkout().ErroCheckout)(mensagem,status);}
function contexto(id=ID){
 if(!checkout().ambiente().teste || process.env.VERCEL_ENV!=='preview' || process.env.VERCEL_GIT_COMMIT_REF!=='codex/preparacao-vendas')falhar('Recuperação restrita ao Preview de preparação.');
 if(id!==ID)falhar('Pedido não autorizado para esta recuperação.',404);
}
function chave(tipo,token){if(!/^[a-f0-9]{64}$/.test(token||''))falhar('Acesso temporário inválido ou expirado.',401);return checkout().prefixo+'recuperacao:'+tipo+':'+checkout().hash(token);}
function registro(raw){
 let r;try{r=JSON.parse(raw);}catch(_){}
 if(!r||r.tipo!==TIPO||r.id!==ID||!Number.isFinite(r.expiraEm)||r.expiraEm<=Date.now()||r.expiraEm>Date.now()+300000)falhar('Acesso temporário inválido ou expirado. Solicite outro no painel.',401);
 return r;
}
function exigirExpirado(p){
 contexto(p.id);
 if(p.ambiente!=='teste'||!p.pagamento?.pixExpiradoConfirmado||p.pagamento.aprovado||p.pagamento.impedimentoEncerramento)falhar('A recuperação exige este Pix de teste com expiração comprovada.',409);
}
function auditar(p,acao){p.recuperacaoCheckoutHistorico=[...(p.recuperacaoCheckoutHistorico||[]),{acao,em:new Date().toISOString()}].slice(-20);}
async function emitir(id){
 contexto(id);const c=checkout();
 return c.exclusivo(id,async()=>{
  const p=await c.atualizarSemBloqueioRecuperacao(await c.buscar(id));exigirExpirado(p);
  const token=crypto.randomBytes(32).toString('hex'),expiraEm=Date.now()+300000;
  const raw=JSON.stringify({id,tipo:TIPO,expiraEm});
  if(!await c.redis(['SET',chave('link',token),raw,'NX','EX',300]))falhar('Não foi possível emitir o acesso temporário.',503);
  auditar(p,'emitido');await c.salvar(p);
  return {acessoTemporario:token,expiraEm};
 });
}
async function resgatar(token){
 contexto();const c=checkout(),key=chave('link',token),raw=await c.redis(['GET',key]),r=registro(raw);
 return c.exclusivo(r.id,async()=>{
  const consumido=await c.redis(['EVAL',"if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,key,raw]);
  if(consumido!==1)falhar('Este link já foi usado ou expirou. Solicite outro no painel.',401);
  registro(raw);
  const p=await c.atualizarSemBloqueioRecuperacao(await c.buscar(r.id));exigirExpirado(p);
  const sessao=crypto.randomBytes(32).toString('hex'),ttl=Math.floor((r.expiraEm-Date.now())/1000);
  if(ttl<1)falhar('Acesso temporário expirado.',401);
  auditar(p,'resgatado');await c.salvar(p);
  if(!await c.redis(['SET',chave('sessao',sessao),raw,'NX','EX',ttl]))falhar('Não foi possível iniciar a sessão temporária.',503);
  return {...c.publico(p),token:sessao,recuperacaoTeste:true,expiraEm:r.expiraEm};
 });
}
async function autorizar(p,token,acao){
 contexto(p.id);if(!['status','desistir'].includes(acao))falhar('Acesso temporário sem permissão para esta ação.');
 const key=chave('sessao',token),raw=await checkout().redis(['GET',key]);registro(raw);
 return {key,raw,expiraEm:registro(raw).expiraEm};
}
async function invalidar(acesso){await checkout().redis(['EVAL',"if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,acesso.key,acesso.raw]);}
function validar(acesso){registro(acesso.raw);}
module.exports={ID,emitir,resgatar,autorizar,exigirExpirado,auditar,invalidar,validar};
