const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const id='83891a67a9028883fed00b55b64db215';
async function painel(opcoes={}){
 const ids={},chamadas=[],codigos=[],temporizadores=[];
 function el(tag='div'){return{tag,children:[],style:{},value:'',dataset:{},hidden:false,textContent:'',set id(v){ids[v]=this;},append(...ns){this.children.push(...ns);},insertBefore(n){this.children.unshift(n);},replaceChildren(){this.children=[];},setAttribute(){},scrollIntoView(){},addEventListener(t,f){this[t]=f;}};}
 for(const nome of ['acesso','chave','carregar','mensagem','filtros','sair','busca','filtro','imprimir','pedidos','contagem','avisoAmbiente','paginacao','anterior','proxima','buscarPedidos','paginacaoRodape','anteriorRodape','proximaRodape','paginaRodape','voltarTopo','topoPainel'])ids[nome]=el();
 ids.filtro.value='todos';ids.chave.value='f'.repeat(32);
 const p={id:opcoes.id||id,ambiente:opcoes.ambiente||'teste',criadoEm:new Date().toISOString(),gestao:{status:'Recebido'},cliente:{nome:'Fictício',endereco:{}},itens:[],pacotes:[],frete:{centavos:0},subtotal:100,total:100,pagamento:{status:'canceled',detalhe:'expired'}};
 const ctx={URL,Date,document:{getElementById:id=>ids[id],createElement:el},window:{location:{href:'https://preview.test/pedidos.html'},confirm:()=>opcoes.confirmar!==false},setTimeout:(fn,ms)=>{temporizadores.push({fn,ms});},qrcode:()=>({addData:v=>codigos.push(v),make(){},createDataURL:()=> 'data:image/png;base64,FICTICIO'}),fetch:async(url,opts)=>{
  const b=JSON.parse(opts.body);chamadas.push(b);
  return {ok:true,json:async()=>b.acao==='listar'?{pedidos:[p],teste:true}:{acessoTemporario:opcoes.invalido?'invalido':'a'.repeat(64),expiraEm:Date.now()+300000}};
 }};
 vm.runInNewContext(fs.readFileSync('js/pedidos.js','utf8'),ctx);await ids.acesso.submit({preventDefault(){}});
 const todos=n=>[n,...n.children.flatMap(todos)];return{ids,chamadas,codigos,temporizadores,todos:()=>todos(ids.pedidos)};
}
test('QR de recuperação exige confirmação, usa origem Preview e não mostra segredo como texto',async()=>{
 const n=await painel({confirmar:false});await n.todos().find(e=>e.textContent==='Recuperar checkout expirado de teste').click();assert.deepEqual(n.chamadas.map(c=>c.acao),['listar']);assert.equal(n.codigos.length,0);
 const t=await painel();await t.todos().find(e=>e.textContent==='Recuperar checkout expirado de teste').click();
 assert.deepEqual(t.chamadas[1],{acao:'recuperarCheckoutTeste',id,confirmacao:id});
 const url=new URL(t.codigos[0]);assert.equal(url.origin,'https://preview.test');assert.equal(url.pathname,'/retomar-teste.html');assert.equal(url.search,'');assert.equal(url.hash,'#acesso='+'a'.repeat(64));
 assert.equal(t.todos().some(e=>e.textContent.includes('a'.repeat(64))),false);assert.equal(t.todos().filter(e=>e.tag==='img').length,1);
 assert.ok(t.temporizadores[0].ms>0&&t.temporizadores[0].ms<=300000);
 await t.todos().find(e=>e.textContent==='Recuperar checkout expirado de teste').click();
 t.temporizadores[0].fn();assert.equal(t.todos().filter(e=>e.tag==='img').length,1);
 t.temporizadores[1].fn();assert.equal(t.todos().filter(e=>e.tag==='img').length,0);
});
test('outro pedido, produção ou resposta inválida não expõem QR',async()=>{
 for(const opcoes of [{id:'outro'},{ambiente:'producao'}]){const n=await painel(opcoes);assert.equal(n.todos().some(e=>e.textContent==='Recuperar checkout expirado de teste'),false);assert.equal(n.codigos.length,0);}
 const t=await painel({invalido:true});await t.todos().find(e=>e.textContent==='Recuperar checkout expirado de teste').click();assert.equal(t.codigos.length,0);assert.equal(t.todos().some(e=>e.tag==='img'),false);
});
