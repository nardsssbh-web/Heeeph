const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const criar = require('../tools/webhook-teste/handler.cjs');
const configurarConexao = require('../tools/webhook-teste/conexao.cjs');
test('rotação do receptor usa integração e nunca recai nas credenciais manuais antigas',()=>{
  const env={KV_REST_API_URL:'antiga',KV_REST_API_TOKEN:'antigo',UPSTASH_REDIS_REST_URL:'antiga',UPSTASH_REDIS_REST_TOKEN:'antigo',RECEPTOR_KV_REST_API_URL:'nova',RECEPTOR_KV_REST_API_TOKEN:'novo'};
  configurarConexao(env); assert.equal(env.KV_REST_API_URL,'nova'); assert.equal(env.KV_REST_API_TOKEN,'novo'); assert.equal(env.UPSTASH_REDIS_REST_TOKEN,undefined);
  delete env.RECEPTOR_KV_REST_API_URL; delete env.RECEPTOR_KV_REST_API_TOKEN; configurarConexao(env);
  assert.equal(env.KV_REST_API_URL,''); assert.equal(env.KV_REST_API_TOKEN,'');
});
const ambiente = { nome: 'teste', teste: true, webhookSecret: 'segredo-simulado', accessToken: 'simulado', publicKey: 'publica', redisUrl: 'https://redis.test', redisToken: 'simulado' };
function resposta() { return { setHeader() {}, status(n) { this.http=n; return this; }, end() {}, json(d) { this.body=d; } }; }
function requisicao(valida) {
  const ts='1792148621', requestId='teste-receptor', id='ORDTEST';
  const v1=crypto.createHmac('sha256', ambiente.webhookSecret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');
  return { method:'POST', query:{'data.id':id}, headers:{'x-request-id':requestId,'x-signature':`ts=${ts},v1=${valida?v1:'0'.repeat(64)}`} };
}
test('receptor público recusa assinatura inválida sem consultar nem alterar pedido', async()=>{
  let chamadas=0; const res=resposta();
  await criar({ambiente:()=>ambiente,notificar:async()=>{chamadas++;}})(requisicao(false),res);
  assert.equal(res.http,401); assert.equal(chamadas,0);
});
test('receptor confirma somente persistência autenticada da order existente', async()=>{
  const chamadas=[],res=resposta();
  await criar({ambiente:()=>ambiente,configurado:async(cobrar)=>{assert.equal(cobrar,false);return '123';},notificar:async(...args)=>{chamadas.push(args);return {id:'a'.repeat(32),pagamento:{status:'failed'},webhookRecebido:{assinaturaValidada:true,em:'2026-10-16T00:00:00Z'}};}})(requisicao(true),res);
  assert.equal(res.http,200); assert.equal(res.body.processado,true); assert.deepEqual(chamadas,[['ORDTEST',{assinaturaValidada:true}]]);
});

test('notificação automática assinada em minúsculas consulta o ID original sem criar pagamento',async()=>{
  const req=requisicao(true),res=resposta(),chamadas=[];
  req.headers['x-signature']='ts=1792148621,v1='+crypto.createHmac('sha256',ambiente.webhookSecret).update('id:ordtest;request-id:teste-receptor;ts:1792148621;').digest('hex');
  await criar({ambiente:()=>ambiente,configurado:async()=> '123',notificar:async(id)=>{chamadas.push(id);return {id:'b'.repeat(32),pagamento:{status:'processed'},webhookRecebido:{assinaturaValidada:true}};}})(req,res);
  assert.equal(res.http,200);assert.deepEqual(chamadas,['ORDTEST']);assert.equal(res.body.processado,true);
});
test('receptor bloqueia produção e falha de persistência', async()=>{
  let chamadas=0; const res=resposta();
  await criar({ambiente:()=>({...ambiente,nome:'producao',teste:false}),notificar:async()=>{chamadas++;}})(requisicao(true),res);
  assert.equal(res.http,503); assert.equal(chamadas,0);
  const erro=resposta(); await criar({ambiente:()=>ambiente,configurado:async()=> '123',notificar:async()=>{throw Error('falha');}})(requisicao(true),erro);
  assert.equal(erro.http,503); assert.equal(erro.body.processado,false);
});
test('receptor não consulta order quando a conta de teste não é confirmada',async()=>{
  let consultas=0; const res=resposta();
  await criar({ambiente:()=>ambiente,configurado:async()=>{throw Error('conta não confirmada');},notificar:async()=>{consultas++;}})(requisicao(true),res);
  assert.equal(res.http,503); assert.equal(res.body.assinaturaValidada,true); assert.equal(consultas,0);
});
