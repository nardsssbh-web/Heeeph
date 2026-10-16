const test=require('node:test'),assert=require('node:assert/strict');
const {getTodosOsProdutos}=require('../produtos');
const {montarCotacao}=require('../lib/frete');
const produtos=getTodosOsProdutos();
test('catálogo tem identificadores únicos e as artes antes ambíguas são cotáveis separadamente',()=>{
 assert.equal(new Set(produtos.map(p=>p.id)).size,produtos.length);
 for(const id of ['bebidas-colecao-in-vino','bebidas-rede-social-amigos','games-retro-gamer','games-arcade']){
  const r=montarCotacao({cep:'01001000',itens:[{id,medida:'20x28cm',quantidade:1}]});assert.equal(r.volumes[0].insurance,24.9);
 }
});
test('identificadores antigos ambíguos e produtos Em Breve não permitem pagamento',()=>{
 for(const id of ['bebidas-in-vino','fotos-reais-foto2','games-retro',...produtos.filter(p=>/em breve/i.test(p.nome)).map(p=>p.id)])
  assert.throws(()=>montarCotacao({cep:'01001000',itens:[{id,medida:'20x28cm',quantidade:1}]}),{status:422});
});
