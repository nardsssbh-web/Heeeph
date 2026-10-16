const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {assinaturaValida,diagnosticoAssinatura}=require('../lib/webhook');
test('diagnóstico da assinatura distingue ausência e divergência sem revelar headers, chave ou hash',()=>{
 const segredo='segredo-local-somente-fixture';const req={query:{'data.id':'ORDTEST'},headers:{'x-request-id':'req-teste'}};
 assert.equal(diagnosticoAssinatura(req,segredo).motivo,'assinatura_ausente');
 const assinar=id=>crypto.createHmac('sha256',segredo).update(`id:${id};request-id:req-teste;ts:1792160000;`).digest('hex');
 req.headers['x-signature']='ts=1792160000,v1='+assinar('ordtest');
 assert.deepEqual(diagnosticoAssinatura(req,segredo),{valida:false,motivo:'assinatura_divergente',requestIdPresente:true,varianteMinusculaConfere:true});
 assert.equal(assinaturaValida(req,segredo),false);
 assert.equal(JSON.stringify(diagnosticoAssinatura(req,segredo)).includes(segredo),false);
 req.headers['x-signature']='ts=1792160000,v1='+assinar('ORDTEST');assert.equal(assinaturaValida(req,segredo),true);
 req.query['data.id']='ORDOUTRO';assert.equal(assinaturaValida(req,segredo),false);
 delete req.headers['x-request-id'];assert.equal(assinaturaValida(req,segredo),false);
 req.query['data.id']='ORDTEST';req.headers['x-signature']='ts=1792160000,v1='+crypto.createHmac('sha256',segredo).update('id:ORDTEST;ts:1792160000;').digest('hex');
 assert.equal(assinaturaValida(req,segredo),true);
});
