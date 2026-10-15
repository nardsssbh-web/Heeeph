const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('status no topo, produto destacado e consulta com retorno no próprio pedido',async()=>{
 const ids={};function el(tag='div'){return {tag,children:[],value:'',dataset:{},hidden:false,disabled:false,textContent:'',className:'',set id(v){this._id=v;ids[v]=this;},get id(){return this._id;},append(...x){this.children.push(...x);},insertBefore(x,y){this.children.splice(this.children.indexOf(y),0,x);},replaceChildren(){this.children=[];},setAttribute(){},scrollIntoView(){this.scrolled=true;},addEventListener(t,f){this[t]=f;}};}
 for(const id of ['acesso','chave','carregar','mensagem','filtros','sair','busca','filtro','imprimir','pedidos','contagem','avisoAmbiente'])ids[id]=el();ids.filtro.value='todos';ids.chave.value='x'.repeat(32);
 let p={id:'abc',gestao:{status:'Recebido'},cliente:{nome:'Teste',email:'teste',telefone:'',endereco:{}},itens:[{nome:'Amizade',medida:'20x28',quantidade:1,centavos:2490}],frete:{centavos:1000},pacotes:[],total:3490,subtotal:2490,criadoEm:new Date().toISOString(),pagamento:{aprovado:true,status:'processed'}};
 const ctx={document:{getElementById:id=>ids[id],createElement:el},window:{confirm:()=>true},fetch:async(url,o)=>{const b=JSON.parse(o.body);if(b.acao==='etapa')p={...p,gestao:{status:b.status}};return {ok:true,json:async()=>b.acao==='listar'?{pedidos:[p]}:{pedido:p}};}};
 vm.runInNewContext(fs.readFileSync('js/pedidos.js','utf8'),ctx);await ids.acesso.submit({preventDefault(){}});
 const all=n=>[n,...n.children.flatMap(all)],card=()=>ids['pedido-abc'];
 assert.equal(all(card()).find(n=>n.className==='etapa-topo').textContent,'Recebido');
 assert.ok(all(card()).some(n=>n.className==='produtos-destaque'));
 const select=all(card()).find(n=>n.tag==='select');select.value='Em Preparação';await all(card()).find(n=>n.textContent==='Salvar status').click();
 assert.equal(all(card()).find(n=>n.className==='etapa-topo').textContent,'Em Preparação');
 assert.match(all(card()).find(n=>n.className==='retorno-pedido').textContent,/Status salvo/);
 await all(card()).find(n=>n.textContent==='Consultar Pagamento').click();assert.match(all(card()).find(n=>n.className==='retorno-pedido').textContent,/Consulta realizada.*Aprovado/);assert.equal(card().scrolled,true);
 assert.equal(all(card()).find(n=>n.className==='retorno-pedido').dataset.tipo,'aprovado');
 for(const [pagamento,cor] of [[{status:'processing'},'pendente'],[{status:'failed'},'recusado'],[{status:'error'},'recusado'],[null,'info']]){
  p={...p,pagamento};await all(card()).find(n=>n.textContent==='Consultar Pagamento').click();
  assert.equal(all(card()).find(n=>n.className==='retorno-pedido').dataset.tipo,cor);
 }
 let liberar;
 ctx.fetch=async()=>{await new Promise(r=>liberar=r);throw new Error('Falha simulada');};
 const button=all(card()).find(n=>n.textContent==='Consultar Pagamento'),consulta=button.click();
 assert.equal(button.disabled,true);assert.equal(button.textContent,'Consultando…');
 assert.match(all(card()).find(n=>n.className==='retorno-pedido').textContent,/Consultando/);
 liberar();await consulta;assert.equal(button.disabled,false);
 assert.equal(all(card()).find(n=>n.className==='retorno-pedido').dataset.tipo,'erro');
});
