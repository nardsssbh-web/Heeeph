const test = require('node:test');
const assert = require('node:assert/strict');
const { montarCotacao, normalizarOpcoes } = require('../lib/frete.js');
const handler = require('../api/frete.js');
const catalogo = [{ id: 'placa', orientacao: 'vertical', preco: '' }];
const config = { cepOrigem: '06414025' };
const body = { cep: '30220060', itens: [{ id: 'placa', medida: '20x28cm', quantidade: 2, preco: 0.01, weight: 0.01 }] };

test('agrupa produtos por tamanho e usa preços oficiais da galeria no seguro', () => {
  const cotacao = montarCotacao(body, catalogo, config);
  assert.deepEqual(cotacao.volumes, [{ width: 25, length: 30, height: 2, weight: 0.33, insurance: 49.8 }]);
  assert.equal(cotacao.products, undefined);
  const misto = montarCotacao({ ...body, itens: [...body.itens, { id: 'placa', medida: '10x15cm', quantidade: 4 }] }, catalogo, config);
  assert.deepEqual(misto.volumes, [{ width: 25, length: 30, height: 3, weight: 0.49, insurance: 101.4 }]);
});
test('recusa CEP, quantidades, tamanhos ausentes, orientação incompatível e IDs ambíguos', () => {
  assert.throws(() => montarCotacao({ ...body, cep: '123' }, catalogo, config), /CEP/);
  assert.throws(() => montarCotacao({ ...body, itens: [{ id: 'placa', medida: '20x28', quantidade: 1.5 }] }, catalogo, config), /quantidades/);
  assert.throws(() => montarCotacao({ ...body, itens: [...body.itens, ...body.itens] }, catalogo, config), /quantidades/);
  assert.throws(() => montarCotacao(body, [], config), /WhatsApp/);
  assert.throws(() => montarCotacao(body, [...catalogo, ...catalogo], config), /WhatsApp/);
  for (const medida of [undefined, '30x40cm', '28x20cm']) {
    assert.throws(() => montarCotacao({ ...body, itens: [{ id: 'placa', medida, quantidade: 1 }] }, catalogo, config));
  }
});
test('usa tarifa customizada, aceita frete zero e filtra serviços indisponíveis', () => {
  const opcoes = normalizarOpcoes([
    { id: 1, name: 'PAC', company: { name: 'Correios' }, price: '30', custom_price: '24.53', delivery_time: 5, custom_delivery_time: 4 },
    { id: 2, name: 'SEDEX', error: 'Indisponível' },
    { id: 3, name: 'Grátis', custom_price: 0, custom_delivery_time: 1 },
    { id: 4, name: 'Inválido', price: null }
  ]);
  assert.equal(opcoes.length, 2);
  assert.equal(opcoes[0].preco, 0);
  assert.equal(opcoes[1].preco, 24.53);
  assert.equal(opcoes[1].prazo, 4);
});
test('endpoint desligado não chama o Melhor Envio nem expõe credenciais', async () => {
  const original = process.env.FRETE_ATIVO;
  process.env.FRETE_ATIVO = 'false';
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
  await handler({ method: 'POST', body }, res);
  assert.equal(res.code, 503);
  assert.match(res.data.mensagem, /WhatsApp/);
  if (original === undefined) delete process.env.FRETE_ATIVO; else process.env.FRETE_ATIVO = original;
});
test('endpoint recusa GET', async () => {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
  await handler({ method: 'GET' }, res);
  assert.equal(res.code, 405);
});

test('endpoint consulta sandbox com segredo no servidor e bloqueia sandbox em produção', async () => {
  const configuracao = require('../config/frete.json');
  const produto = require('../produtos.js').getTodosOsProdutos().find(p => p.id === 'bandas-accept');
  const precoOriginal = produto.preco;
  const envOriginal = { ...process.env };
  const fetchOriginal = global.fetch;
  const res = () => ({ setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; } });
  try {
    process.env.FRETE_ATIVO = 'true';
    process.env.MELHOR_ENVIO_TOKEN = 'segredo-de-teste';
    process.env.MELHOR_ENVIO_USER_AGENT = 'HEEEPH (teste@example.com)';
    process.env.MELHOR_ENVIO_AMBIENTE = 'sandbox';
    process.env.VERCEL_ENV = 'preview';
    produto.preco = 25;

    let chamadas = 0;
    global.fetch = async (url, options) => {
      chamadas++;
      assert.match(url, /sandbox.melhorenvio.com.br/);
      assert.equal(options.headers.Authorization, 'Bearer segredo-de-teste');
      assert.equal(JSON.parse(options.body).volumes[0].insurance, 24.9);
      return { ok: true, json: async () => [{ id: 1, name: 'PAC', company: { name: 'Correios' }, custom_price: '24.53', custom_delivery_time: 4 }] };
    };
    const req = { method: 'POST', body: { cep: '30220060', itens: [{ id: produto.id, medida: '20x28cm', quantidade: 1 }] } };
    const sucesso = res();
    await handler(req, sucesso);
    assert.equal(sucesso.code, 200);
    assert.equal(sucesso.data.teste, true);
    assert.equal(sucesso.data.opcoes[0].preco, 24.53);
    assert.doesNotMatch(JSON.stringify(sucesso.data), /segredo/);
    process.env.VERCEL_ENV = 'production';
    const bloqueado = res();
    await handler(req, bloqueado);
    assert.equal(bloqueado.code, 503);
    assert.equal(chamadas, 1);
    process.env.VERCEL_ENV = 'preview';
    global.fetch = async () => { throw new Error('segredo-de-teste'); };
    const falha = res();
    await handler(req, falha);
    assert.equal(falha.code, 502);
    assert.doesNotMatch(JSON.stringify(falha.data), /segredo/);
  } finally {
    produto.preco = precoOriginal;

    global.fetch = fetchOriginal;
    for (const key of Object.keys(process.env)) if (!(key in envOriginal)) delete process.env[key];
    Object.assign(process.env, envOriginal);
  }
});

