const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('status no topo, produto destacado e consulta com retorno no próprio pedido',async()=>{
 const ids={};function el(tag='div'){return {tag,children:[],value:'',dataset:{},hidden:false,disabled:false,textContent:'',className:'',set id(v){this._id=v;ids[v]=this;},get id(){return this._id;},append(...x){this.children.push(...x);},insertBefore(x,y){this.children.splice(this.children.indexOf(y),0,x);},replaceChildren(){this.children=[];},setAttribute(){},scrollIntoView(){this.scrolled=true;},addEventListener(t,f){this[t]=f;}};}
 for(const id of ['acesso','chave','carregar','mensagem','filtros','sair','busca','filtro','imprimir','pedidos','contagem','avisoAmbiente','paginacao','anterior','proxima','buscarPedidos','paginacaoRodape','anteriorRodape','proximaRodape','paginaRodape','voltarTopo','topoPainel'])ids[id]=el();ids.filtro.value='todos';ids.chave.value='x'.repeat(32);
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
 p={...p,pagamento:{status:'processing'}};await all(card()).find(n=>n.textContent==='Consultar Pagamento').click();
 assert.equal(all(card()).find(n=>n.className==='retorno-pedido').dataset.tipo,'pendente');
 p={...p,pagamento:{aprovado:true,status:'processed'}};await ids.acesso.submit({preventDefault(){}});
 assert.ok(all(card()).some(n=>n.className==='selo aprovado'));assert.equal(all(card()).some(n=>n.className==='retorno-pedido'&&/Aguardando/.test(n.textContent)),false);
 let liberar;
 ctx.fetch=async()=>{await new Promise(r=>liberar=r);throw new Error('Falha simulada');};
 const button=all(card()).find(n=>n.textContent==='Consultar Pagamento'),consulta=button.click();
 assert.equal(button.disabled,true);assert.equal(button.textContent,'Consultando…');
 assert.match(all(card()).find(n=>n.className==='retorno-pedido').textContent,/Consultando/);
 liberar();await consulta;assert.equal(button.disabled,false);
 assert.equal(all(card()).find(n=>n.className==='retorno-pedido').dataset.tipo,'erro');
});

test('painel envia busca e cursores ao servidor e ignora resposta recebida depois de sair',async()=>{
 const ids={};function el(){return{children:[],value:'',dataset:{},hidden:false,disabled:false,textContent:'',set id(v){ids[v]=this;},append(...ns){this.children.push(...ns);},insertBefore(n){this.children.unshift(n);},replaceChildren(){this.children=[];},setAttribute(){},scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;},addEventListener(t,fn){this[t]=fn;}};}
 for(const id of ['acesso','chave','carregar','mensagem','filtros','sair','busca','filtro','imprimir','pedidos','contagem','avisoAmbiente','paginacao','anterior','proxima','buscarPedidos','paginacaoRodape','anteriorRodape','proximaRodape','paginaRodape','voltarTopo','topoPainel'])ids[id]=el();
 ids.filtro.value='todos';ids.chave.value='ficticio';
 const chamadas=[],cursor='a'.repeat(32);
 const ctx={document:{getElementById:id=>ids[id],createElement:el},window:{print(){}},fetch:async(url,opts)=>{const body=JSON.parse(opts.body);chamadas.push(body);return{ok:true,json:async()=>({pedidos:[],cursorProximo:body.cursor?null:cursor,teste:true})};}};
 vm.runInNewContext(fs.readFileSync('js/pedidos.js','utf8'),ctx);
 const evento={preventDefault(){}};
 await ids.acesso.submit(evento);assert.equal(ids.proxima.disabled,false);assert.equal(ids.anterior.disabled,true);
 await ids.proximaRodape.click();assert.equal(chamadas.at(-1).cursor,cursor);assert.equal(ids.proxima.disabled,true);assert.equal(ids.proximaRodape.disabled,true);assert.equal(ids.anterior.disabled,false);assert.equal(ids.anteriorRodape.disabled,false);
 assert.equal(ids.contagem.scrolled,true);assert.equal(ids.contagem.focused,true);assert.match(ids.paginaRodape.textContent,/Página 2.*fim/);
 const antesTopo=chamadas.length;ids.voltarTopo.click();assert.equal(ids.topoPainel.scrolled,true);assert.equal(ids.topoPainel.focused,true);assert.equal(chamadas.length,antesTopo);
 await ids.anterior.click();assert.equal(chamadas.at(-1).cursor,null);
 ids.busca.value='João antigo';ids.filtro.value='aprovados';await ids.filtros.submit(evento);
 assert.equal(chamadas.at(-1).busca,'João antigo');assert.equal(chamadas.at(-1).filtro,'aprovados');assert.equal(chamadas.at(-1).cursor,null);
 let liberar;ctx.fetch=async()=>{await new Promise(r=>liberar=r);return{ok:true,json:async()=>({pedidos:[],cursorProximo:cursor})};};
 const pendente=ids.acesso.submit(evento);assert.equal(ids.anteriorRodape.disabled,true);assert.equal(ids.proximaRodape.disabled,true);ids.sair.click();liberar();await pendente;
 assert.equal(ids.paginacao.hidden,true);assert.equal(ids.paginacaoRodape.hidden,true);assert.equal(ids.filtros.hidden,true);assert.equal(ids.contagem.textContent,'');assert.equal(ids.mensagem.textContent,'Acesso encerrado.');
});
