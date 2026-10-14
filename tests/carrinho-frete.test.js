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
  const contexto = vm.createContext({
    fetch, AbortController, setTimeout, clearTimeout, console,
    document: { getElementById: id => elementos[id] || null, createElement: elemento,
      addEventListener: (nome, fn) => { eventos[nome] = fn; } },
    window: { addEventListener() {} },
    localStorage: { getItem: chave => dados[chave] ?? null, setItem: (chave, valor) => { dados[chave] = valor; }, removeItem: chave => { delete dados[chave]; } }
  });
  vm.runInContext(fs.readFileSync('js/carrinho.js', 'utf8'), contexto);
  vm.runInContext('subtotalAtual = 20', contexto);
  return { contexto, elementos, eventos };
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

