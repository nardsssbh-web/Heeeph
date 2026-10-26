const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function preparar(fetch) {
  const elementos = {};
  function elemento() {
    return { value: '30220-060', textContent: '', children: [],
      replaceChildren() { this.children = []; }, append(...itens) { this.children.push(...itens); },
      addEventListener(nome, fn) { this[nome] = fn; } };
  }
  for (const id of ['cepFrete', 'mensagemFrete', 'calcularFreteBtn', 'opcoesFrete', 'freteValor', 'totalValor', 'legendaTotal']) elementos[id] = elemento();
  const dados = { heeeph_cart: JSON.stringify([{ id: 'placa', nome: 'Placa', preco: 'R$ 20,00', quantidade: 1 }]) };
  const eventos = {};
  const eventosJanela = {}, sessao = {}, alertas = [];
  const contexto = vm.createContext({
    fetch, AbortController, setTimeout, clearTimeout, console,
    document: { getElementById: id => elementos[id] || null, createElement: elemento,
      addEventListener: (nome, fn) => { eventos[nome] = fn; } },
    window: { location:{href:'carrinho.html'}, addEventListener(nome,fn) { eventosJanela[nome]=fn; } },
    alert: mensagem=>alertas.push(mensagem),
    sessionStorage:{getItem:k=>sessao[k]??null,setItem:(k,v)=>sessao[k]=v,removeItem:k=>delete sessao[k]},
    localStorage: { getItem: chave => dados[chave] ?? null, setItem: (chave, valor) => { dados[chave] = valor; }, removeItem: chave => { delete dados[chave]; } }
  });
  vm.runInContext(fs.readFileSync('js/carrinho.js', 'utf8'), contexto);
  vm.runInContext('subtotalAtual = 20', contexto);
  return { contexto, elementos, eventos, eventosJanela, sessao, alertas };
}

test('envia o tamanho e altera somente a versão selecionada da mesma arte', async () => {
  let pedido;
  const { contexto } = preparar(async (url, options) => {
    pedido = JSON.parse(options.body);
    return { ok: true, json: async () => ({ opcoes: [] }) };
  });
  vm.runInContext(`localStorage.setItem('heeeph_cart', JSON.stringify([
    {id:'placa', medida:'10x15cm', quantidade:1, quantity:1},
    {id:'placa', medida:'20x28cm', quantidade:2, quantity:2}
  ])); alterarQuantidadeSeguro(1, 1);`, contexto);
  await vm.runInContext('calcularFrete()', contexto);
  assert.deepEqual(pedido.itens, [
    {id:'placa', medida:'10x15cm', quantidade:1},
    {id:'placa', medida:'20x28cm', quantidade:3}
  ]);
  vm.runInContext('removerDoCarrinhoSeguro(0)', contexto);
  const restante = JSON.parse(vm.runInContext("localStorage.getItem('heeeph_cart')", contexto));
  assert.equal(restante.length, 1);
  assert.equal(restante[0].medida, '20x28cm');
});

test('seleção soma frete ao subtotal e CEP editado limpa a seleção', async () => {
  const { contexto, elementos, eventos } = preparar(async () => ({ ok: true, json: async () => ({ opcoes: [
    { id: '1', transportadora: 'Correios', servico: 'PAC', preco: 24.53, prazo: 4 }
  ] }) }));
  await vm.runInContext('calcularFrete()', contexto);
  elementos.opcoesFrete.children[0].children[0].change();
  assert.match(elementos.totalValor.textContent, /44,53/);
  assert.match(decodeURIComponent(vm.runInContext('montarMensagemWhatsApp()', contexto)), /Frete cotado/);
  elementos.cepFrete.value = '01001000';
  eventos.input({ target: elementos.cepFrete, ...{} });
  // O elemento simulado também deve carregar o ID do input real.
  elementos.cepFrete.id = 'cepFrete';
  eventos.input({ target: elementos.cepFrete });
  assert.equal(elementos.opcoesFrete.children.length, 0);
  assert.match(elementos.totalValor.textContent, /20,00/);
});
test('resposta antiga não volta após alteração do pedido', async () => {
  let concluir;
  const { contexto, elementos } = preparar(() => new Promise(resolve => { concluir = resolve; }));
  const pendente = vm.runInContext('calcularFrete()', contexto);
  vm.runInContext('invalidarFrete()', contexto);
  concluir({ ok: true, json: async () => ({ opcoes: [{ id: '1', preco: 10 }] }) });
  await pendente;
  assert.equal(elementos.opcoesFrete.children.length, 0);
  assert.equal(elementos.calcularFreteBtn.disabled, false);
});
test('erro de API mantém frete a confirmar e pagamento manual', async () => {
  const { contexto, elementos } = preparar(async () => ({ ok: false, json: async () => ({ mensagem: 'Confirme pelo WhatsApp.' }) }));
  await vm.runInContext('calcularFrete()', contexto);
  assert.equal(elementos.freteValor.textContent, 'A confirmar');
  assert.match(elementos.mensagemFrete.textContent, /WhatsApp/);
  assert.match(decodeURIComponent(vm.runInContext('montarMensagemWhatsApp()', contexto)), /Frete: a confirmar/);
});
test('sandbox aparece como teste e não vira valor comercial no WhatsApp', async () => {
  const { contexto, elementos } = preparar(async () => ({ ok: true, json: async () => ({ teste: true, opcoes: [
    { id: '1', transportadora: 'Correios', servico: 'PAC', preco: 10, prazo: 1 }
  ] }) }));
  await vm.runInContext('calcularFrete()', contexto);
  elementos.opcoesFrete.children[0].children[0].change();
  assert.match(elementos.freteValor.textContent, /teste/);
  const mensagem = decodeURIComponent(vm.runInContext('montarMensagemWhatsApp()', contexto));
  assert.match(mensagem, /Frete: a confirmar/);
  assert.doesNotMatch(mensagem, /Total com frete/);
});

test('carrinho não interpreta HTML adulterado nem carrega imagem externa',()=>{
 const {contexto,elementos}=preparar(async()=>{});elementos.conteudoCarrinho={innerHTML:''};
 vm.runInContext(`localStorage.setItem('heeeph_cart',JSON.stringify([{id:'placa',nome:'<script>alert(1)</script>',medida:'<iframe>',imagem:'https://externo.test/rastrear.png',preco:'<b>preço</b>',quantidade:1}]));renderCarrinho();`,contexto);
 const html=elementos.conteudoCarrinho.innerHTML;assert.doesNotMatch(html,/<script>|<iframe>|<b>|https:\/\/externo/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;iframe&gt;/);
 assert.equal(vm.runInContext("imagemDoCarrinho('placas/bebida/in-vino.png')",contexto),'placas/bebida/in-vino.png');
 assert.equal(vm.runInContext("imagemDoCarrinho('placas/../api/pedidos.png')",contexto),'');
});

test('resposta de frete é descartada se as placas mudarem durante a consulta sem evento storage',async()=>{
 let concluir;const n=preparar(()=>new Promise(resolve=>concluir=resolve));
 const consulta=vm.runInContext('calcularFrete()',n.contexto);
 vm.runInContext("alterarQuantidadeSeguro(0,1)",n.contexto);
 concluir({ok:true,json:async()=>({opcoes:[{id:'1',preco:10}]})});await consulta;
 assert.equal(n.elementos.opcoesFrete.children.length,0);assert.match(n.elementos.mensagemFrete.textContent,/mudou/);
 assert.equal(n.elementos.freteValor.textContent,'A confirmar');assert.equal(n.elementos.calcularFreteBtn.disabled,false);
});

test('cotação antiga não segue ao checkout após mudança de quantidade, modelo, tamanho ou CEP',async()=>{
 for(const mudar of ["alterarQuantidadeSeguro(0,1)",
  "const a=obterCarrinhoSeguro();a[0].id='outra-placa';salvarCarrinhoSeguro(a)",
  "const a=obterCarrinhoSeguro();a[0].medida='10x15cm';salvarCarrinhoSeguro(a)",
  "document.getElementById('cepFrete').value='01001000'"]){
  const n=preparar(async()=>({ok:true,json:async()=>({opcoes:[{id:'1',preco:10}]})}));
  await vm.runInContext('calcularFrete()',n.contexto);n.elementos.opcoesFrete.children[0].children[0].change();
  vm.runInContext(mudar+';finalizarCheckoutTeste()',n.contexto);
  assert.equal(n.contexto.window.location.href,'carrinho.html');assert.equal(n.sessao.heeeph_checkout,undefined);
  assert.match(n.alertas.at(-1),/Calcule o frete novamente/);assert.equal(n.elementos.opcoesFrete.children.length,0);
 }
});

test('novo cálculo após remover placa ou alterar quantidade leva somente os itens atuais ao checkout',async()=>{
 const enviados=[];const n=preparar(async(url,opts)=>{enviados.push(JSON.parse(opts.body));return {ok:true,json:async()=>({opcoes:[{id:'1',preco:15}]})};});
 vm.runInContext("localStorage.setItem('heeeph_cart',JSON.stringify([{id:'placa',medida:'20x28cm',quantidade:2},{id:'outra',medida:'10x15cm',quantidade:1}]))",n.contexto);
 await vm.runInContext('calcularFrete()',n.contexto);n.elementos.opcoesFrete.children[0].children[0].change();
 vm.runInContext('removerDoCarrinhoSeguro(1);alterarQuantidadeSeguro(0,1);invalidarFrete();finalizarCheckoutTeste()',n.contexto);
 assert.equal(n.sessao.heeeph_checkout,undefined);
 await vm.runInContext('calcularFrete()',n.contexto);n.elementos.opcoesFrete.children[0].children[0].change();
 vm.runInContext('finalizarCheckoutTeste()',n.contexto);
 const checkout=JSON.parse(n.sessao.heeeph_checkout);assert.equal(n.contexto.window.location.href,'pagamento.html');
 assert.deepEqual(checkout.itens,[{id:'placa',medida:'20x28cm',quantidade:3}]);assert.equal(checkout.frete,15);
 assert.deepEqual(checkout.itens,enviados.at(-1).itens);assert.equal(enviados.length,2);
});

test('retorno do histórico invalida frete sem apagar placas nem iniciar pedido',async()=>{
 const n=preparar(async()=>({ok:true,json:async()=>({opcoes:[{id:'1',preco:10}]})}));
 await vm.runInContext('calcularFrete()',n.contexto);n.elementos.opcoesFrete.children[0].children[0].change();
 const antes=vm.runInContext("localStorage.getItem('heeeph_cart')",n.contexto);
 n.eventosJanela.pageshow({persisted:true});
 assert.equal(n.elementos.opcoesFrete.children.length,0);assert.equal(n.elementos.freteValor.textContent,'A confirmar');
 assert.equal(vm.runInContext("localStorage.getItem('heeeph_cart')",n.contexto),antes);assert.deepEqual(n.sessao,{});
});

