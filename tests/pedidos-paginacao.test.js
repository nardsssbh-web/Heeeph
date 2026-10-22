const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../lib/checkout'),listar=require('../lib/pedidos-lista');
async function fixture(fn){
 const original=c.redis,indice=[],db=new Map(),chamadas=[];
 for(let n=1;n<=450;n++){
  const id=n.toString(16).padStart(32,'0');indice.unshift(id);
  db.set(c.prefixo+id,JSON.stringify({id,ambiente:'teste',cliente:{nome:n===10?'João Antigo':'Cliente '+n,email:'ficticio@example.test'},itens:[{nome:'Arte'}],pagamento:{aprovado:n%2===0,status:n%2===0?'processed':'processing'}}));
 }
 c.redis=async(cmd)=>{
  chamadas.push(cmd);
  if(cmd[0]==='ZREVRANGE')return indice.slice(cmd[2],cmd[3]+1);
  if(cmd[0]==='ZREVRANK'){const r=indice.indexOf(cmd[2]);return r<0?null:r;}
  if(cmd[0]==='MGET')return cmd.slice(1).map(k=>db.get(k)||null);
  throw Error('Comando de escrita proibido: '+cmd[0]);
 };
 try{await fn({indice,db,chamadas});}finally{c.redis=original;}
}
test('paginação alcança registros antigos e inclusão nova não desloca o cursor',()=>fixture(async({indice,chamadas})=>{
 const a=await listar({limite:20});assert.equal(a.pedidos.length,20);assert.equal(chamadas.length,2);
 const segundoEsperado=indice[20];indice.unshift('f'.repeat(32));
 const b=await listar({limite:20,cursor:a.cursorProximo});assert.equal(b.pedidos[0].p.id,segundoEsperado);
 assert.equal(b.pedidos.some(x=>a.pedidos.some(y=>y.p.id===x.p.id)),false);
}));
test('busca normaliza acentos, filtra no servidor e continua além da janela de 200 registros',()=>fixture(async()=>{
 let cursor=null,encontrados=[],paginas=0;
 do{const p=await listar({busca:'joao antigo',filtro:'aprovados',cursor});assert.ok(p.examinados<=200);encontrados.push(...p.pedidos);cursor=p.cursorProximo;paginas++;}while(cursor);
 assert.equal(paginas,3);assert.equal(encontrados.length,1);assert.equal(encontrados[0].p.cliente.nome,'João Antigo');
}));
test('ausentes e excluídos não aparecem, ID exato recupera registro fora do índice sem escrever',()=>fixture(async({db,indice,chamadas})=>{
 const oculto=indice[0],ausente=indice[1];db.set(c.prefixo+'gestao:'+oculto,JSON.stringify({excluido:true}));db.delete(c.prefixo+ausente);
 const p=await listar({limite:20});assert.equal(p.pedidos.length,20);assert.equal(p.pedidos.some(x=>[oculto,ausente].includes(x.p.id)),false);
 const id='e'.repeat(32);db.set(c.prefixo+id,JSON.stringify({id,ambiente:'teste',cliente:{nome:'Sem índice'}}));chamadas.length=0;
 assert.equal((await listar({busca:id})).pedidos[0].p.id,id);assert.deepEqual(chamadas.map(x=>x[0]),['MGET']);
}));
test('parâmetros inválidos e cursor desaparecido falham sem varredura ou escrita',()=>fixture(async({chamadas})=>{
 for(const b of [{limite:0},{limite:51},{cursor:'invalido'},{busca:'x'.repeat(101)},{busca:{}},{filtro:'outro'}])await assert.rejects(()=>listar(b),{status:400});
 assert.equal(chamadas.length,0);await assert.rejects(()=>listar({cursor:'f'.repeat(32)}),{status:409});assert.deepEqual(chamadas.map(x=>x[0]),['ZREVRANK']);
}));
