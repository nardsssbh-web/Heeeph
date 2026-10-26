const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {assinaturaValida,diagnosticoAssinatura}=require('../lib/webhook');
test('diagnóstico da assinatura distingue ausência e divergência sem revelar headers, chave ou hash',()=>{
 const segredo='segredo-local-somente-fixture';const req={query:{'data.id':'ORDTEST'},headers:{'x-request-id':'req-teste'}};
 assert.equal(diagnosticoAssinatura(req,segredo).motivo,'assinatura_ausente');
 const assinar=id=>crypto.createHmac('sha256',segredo).update(`id:${id};request-id:req-teste;ts:1792160000;`).digest('hex');
 req.headers['x-signature']='ts=1792160000,v1='+assinar('ordtest');
 assert.deepEqual(diagnosticoAssinatura(req,segredo),{valida:true,motivo:'confirmada',idNormalizado:true});
 assert.equal(assinaturaValida(req,segredo),true);
 assert.equal(assinaturaValida(req,'segredo-incorreto'),false);
 req.headers['x-request-id']='outro-request';assert.equal(assinaturaValida(req,segredo),false);req.headers['x-request-id']='req-teste';
 req.headers['x-signature']=req.headers['x-signature'].replace('1792160000','1792160001');assert.equal(assinaturaValida(req,segredo),false);
 req.headers['x-signature']='ts=1792160000,v1='+assinar('ordtest');
 assert.equal(JSON.stringify(diagnosticoAssinatura(req,segredo)).includes(segredo),false);
 req.headers['x-signature']='ts=1792160000,v1='+assinar('ORDTEST');assert.equal(assinaturaValida(req,segredo),true);
 req.query['data.id']='ORDOUTRO';assert.equal(assinaturaValida(req,segredo),false);
 delete req.headers['x-request-id'];assert.equal(assinaturaValida(req,segredo),false);
 req.query['data.id']='ORDTEST';req.headers['x-signature']='ts=1792160000,v1='+crypto.createHmac('sha256',segredo).update('id:ORDTEST;ts:1792160000;').digest('hex');
 assert.equal(assinaturaValida(req,segredo),true);
});

test('assinatura recusa headers ambíguos, múltiplos valores e manifesto malformado sem lançar erro',()=>{
 const secret='segredo-ficticio',ts='1792160000',rid='req-local';
 const v1=crypto.createHmac('sha256',secret).update(`id:ORDTEST;request-id:${rid};ts:${ts};`).digest('hex');
 const assinatura=`ts=${ts},v1=${v1}`;
 for(const header of [[assinatura],`${assinatura},ts=${ts}`,`${assinatura},V1=${v1}`,`${assinatura}=extra`,`${assinatura},`,7]){
  assert.equal(assinaturaValida({query:{'data.id':'ORDTEST'},headers:{'x-signature':header,'x-request-id':rid}},secret),false);
 }
 for(const requestId of ['a;ts:123','a\nb','a'.repeat(201),['req-local']]){
  assert.equal(assinaturaValida({query:{'data.id':'ORDTEST'},headers:{'x-signature':assinatura,'x-request-id':requestId}},secret),false);
 }
 assert.equal(assinaturaValida({},secret),false);assert.equal(assinaturaValida({query:{'data.id':['ORDTEST']},headers:{}},secret),false);
});
