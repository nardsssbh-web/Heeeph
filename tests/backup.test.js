const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const b=require('../tools/backup/arquivo.cjs');
const dados=Buffer.from('REDIS0014\x00conteudo-sintetico-sem-clientes'),senha='senha-sintetica-exclusiva-para-teste';
test('backup autenticado preserva bytes e usa aleatoriedade por cópia',async()=>{
 const a=await b.proteger(dados,senha),c=await b.proteger(dados,senha);
 assert.notDeepEqual(a,c);assert.deepEqual(await b.abrir(a,senha),dados);
 assert.equal(a.includes(Buffer.from('conteudo-sintetico')),false);
 await assert.rejects(b.abrir(a,'outra-senha-sintetica-exclusiva'),/Senha incorreta/);
 for(const pos of [0,17,35,50,a.length-1]){const adulterado=Buffer.from(a);adulterado[pos]^=1;await assert.rejects(b.abrir(adulterado,senha));}
 await assert.rejects(b.abrir(a.subarray(0,a.length-1),senha));
 await assert.rejects(b.proteger(Buffer.from('nao-e-rdb'),senha));
 await assert.rejects(b.proteger(dados,'curta'));
});
test('ferramenta local verifica sem restaurar, preserva original e recusa sobrescrever',async()=>{
 const pasta=await fs.mkdtemp(path.join(os.tmpdir(),'heeeph-backup-')),entrada=path.join(pasta,'sintetico.rdb'),saida=path.join(pasta,'copia.heeephbak');
 try{
  await fs.writeFile(entrada,dados);
  const criado=await b.executar(['proteger',entrada,saida],senha),verificado=await b.executar(['verificar',saida],senha);
  assert.equal(criado.sha256,verificado.sha256);assert.equal(criado.bytes,dados.length);
  assert.deepEqual(await fs.readFile(entrada),dados);
  const antes=await fs.readFile(saida);
  await assert.rejects(b.executar(['proteger',entrada,saida],senha),{code:'EEXIST'});
  assert.deepEqual(await fs.readFile(saida),antes);
  await assert.rejects(b.executar(['verificar',saida,entrada],senha),/Uso:/);
 }finally{await fs.unlink(entrada).catch(()=>{});await fs.unlink(saida).catch(()=>{});await fs.rmdir(pasta);}
});
