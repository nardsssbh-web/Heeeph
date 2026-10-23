const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const id='83891a67a9028883fed00b55b64db215';
async function abrir(opcoes={}){
 const eventos=[],sessao={...opcoes.sessao},estado={textContent:'',setAttribute(){}},p={id,teste:true,recuperacaoTeste:true,token:'b'.repeat(64),expiraEm:Date.now()+60000,...opcoes.resposta};
 const location={href:'https://preview.test/retomar-teste.html#acesso='+'a'.repeat(64),replace(url){eventos.push(['navegar',url]);}};
 const ctx={URL,Date,JSON,Error,Number,document:{getElementById:()=>estado},window:{location,history:{replaceState(a,b,url){eventos.push(['limparFragmento',url]);}}},localStorage:{getItem:k=>opcoes.recibo||null},sessionStorage:{getItem:k=>sessao[k]||null,setItem(k,v){if(opcoes.storageFalha)throw Error('Armazenamento indisponível');sessao[k]=v;}},fetch:async(url,opts)=>{eventos.push(['fetch',url,JSON.parse(opts.body)]);return{ok:opcoes.ok!==false,json:async()=>p};}};
 if(opcoes.semHistorico)ctx.window.history=undefined;
 vm.runInNewContext(fs.readFileSync('js/retomar-teste.js','utf8'),ctx);await new Promise(setImmediate);return{eventos,sessao,estado};
}
test('resgate limpa fragmento antes de enviar token por POST e guarda só sessão curta',async()=>{
 const t=await abrir();assert.equal(t.eventos[0][0],'limparFragmento');assert.equal(t.eventos[0][1],'/retomar-teste.html');
 assert.equal(t.eventos[1][0],'fetch');assert.equal(t.eventos[1][1],'/api/checkout');assert.equal(t.eventos[1][2].acao,'resgatarCheckoutTeste');
 assert.deepEqual(t.eventos.at(-1),['navegar','pagamento.html']);assert.deepEqual(Object.keys(t.sessao),['heeeph_recuperacao_teste']);
 assert.equal(JSON.parse(t.sessao.heeeph_recuperacao_teste).recuperacaoTeste,true);
});
test('outra compra, preparação ou ausência de proteção do histórico impedem consumo do link',async()=>{
 for(const opcoes of [{recibo:JSON.stringify({id:'outro'})},{sessao:{heeeph_pedido_teste:JSON.stringify({id:'outro'})}},{sessao:{heeeph_preparacao:'pendente'}},{semHistorico:true}]){
  const t=await abrir(opcoes);assert.equal(t.eventos.some(e=>e[0]==='fetch'),false);assert.match(t.estado.textContent,/Nenhum pedido ou pagamento foi criado/);
 }
});
test('resposta inválida ou armazenamento indisponível nunca redirecionam ao checkout',async()=>{
 for(const opcoes of [{resposta:{id:'outro'}},{resposta:{teste:false}},{resposta:{recuperacaoTeste:false}},{resposta:{expiraEm:Date.now()-1}},{storageFalha:true},{ok:false}]){
  const t=await abrir(opcoes);assert.equal(t.eventos.some(e=>e[0]==='navegar'),false);assert.match(t.estado.textContent,/Nenhum pedido ou pagamento foi criado/);
 }
});
