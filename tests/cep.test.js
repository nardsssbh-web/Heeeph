const test=require('node:test'),assert=require('node:assert/strict');
const {consultarCEP,validarEndereco}=require('../lib/cep');
const {divergencia}=require('../js/enderecos');
const api=require('../api/cep');
const referencia={rua:'Praça da Sé',bairro:'Sé',cidade:'São Paulo',uf:'SP'};
function resposta(){return {setHeader(){},status(n){this.http=n;return this;},json(d){this.body=d;return this;}};}
test('conferência tolera acentos, espaços, caixa e abreviações comuns sem aceitar outra rua',()=>{
  assert.equal(divergencia({rua:'Pça. da Se',bairro:' SE ',cidade:'SAO PAULO',uf:'sp'},referencia),null);
  for(const campo of ['rua','bairro','cidade','uf'])assert.equal(divergencia({...referencia,[campo]:'outro'},referencia).campo,campo);
  assert.equal(divergencia({...referencia,rua:'Rua rural',bairro:'Zona rural'},{...referencia,rua:'',bairro:''}),null);
});
test('consulta usa host fixo, limita tempo, filtra dados e reutiliza CEP público sem alterar o cache',async()=>{
  const anterior=global.fetch;let chamadas=0;
  global.fetch=async(url,opts)=>{chamadas++;assert.equal(url,'https://viacep.com.br/ws/01001000/json/');assert.ok(opts.signal);return {ok:true,json:async()=>({cep:'01001-000',logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP',complemento:'não copiar'})};};
  try{const r=await consultarCEP('01001000');assert.deepEqual(r,{cep:'01001000',...referencia});r.rua='adulterada';assert.equal((await consultarCEP('01001000')).rua,'Praça da Sé');assert.equal(chamadas,1);
    const cliente={...referencia,rua:'Rua diferente',numero:'10',complemento:'Apto 1'};const salvo=structuredClone(cliente);
    await assert.rejects(()=>validarEndereco('01001000',cliente),{status:422,campo:'rua'});assert.deepEqual(cliente,salvo);
  }finally{global.fetch=anterior;}
});
test('CEP inválido ou inexistente não permite continuar nem aceita URL do cliente',async()=>{
  const anterior=global.fetch;let chamadas=0;
  global.fetch=async()=>{chamadas++;return {ok:true,json:async()=>({erro:true})};};
  try{for(const cep of ['123','https://localhost','01001-000',['01001000']])await assert.rejects(()=>consultarCEP(cep),{status:400});assert.equal(chamadas,0);
    await assert.rejects(()=>consultarCEP('99999999'),{status:422});
  }finally{global.fetch=anterior;}
});
test('falha, timeout ou resposta divergente não é usada como endereço válido nem fica em cache',async()=>{
  const anterior=global.fetch;
  try{global.fetch=async()=>{throw Error('detalhe privado');};await assert.rejects(()=>consultarCEP('22222222'),{status:503});
    global.fetch=async()=>({ok:true,json:async()=>({cep:'11111111',logradouro:'Rua',bairro:'Centro',localidade:'Cidade',uf:'SP'})});await assert.rejects(()=>consultarCEP('22222222'),{status:503});
    global.fetch=async()=>({ok:true,json:async()=>({cep:'22222-222',logradouro:'',bairro:'',localidade:'Cidade',uf:'SP'})});assert.equal((await consultarCEP('22222222')).rua,'');
  }finally{global.fetch=anterior;}
});
test('rota aceita somente GET e não expõe detalhes de erros internos',async()=>{
  const res=resposta();await api({method:'POST'},res);assert.equal(res.http,405);
  const errado=resposta();await api({method:'GET',query:{cep:['01001000']}},errado);assert.equal(errado.http,400);
  const certo=resposta();await api({method:'GET',query:{cep:'01001000'}},certo);assert.equal(certo.body.cidade,'São Paulo');
});
