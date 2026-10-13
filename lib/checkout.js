const crypto = require('node:crypto');
const { montarCotacao, normalizarOpcoes } = require('./frete');
const embalagens = require('../js/embalagens');
const { getTodosOsProdutos } = require('../produtos');
class ErroCheckout extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const falhar = (message, status) => { throw new ErroCheckout(message, status); };
const hash = valor => crypto.createHash('sha256').update(String(valor)).digest('hex');
const dinheiro = centavos => (centavos / 100).toFixed(2);
const prefixo = 'heeeph:teste:';
const ttl = 30 * 86400;
function texto(v, min, max, campo) {
  if (typeof v !== 'string') falhar(`Confira ${campo}.`);
  const s = v.trim();
  if (s.length < min || s.length > max || /[\x00-\x1f]/.test(s)) falhar(`Confira ${campo}.`);
  return s;
}
function clienteValido(c, cep) {
  if (!c || c.termos !== true) falhar('Aceite os termos e a política de privacidade.');
  const nome = texto(c.nome, 3, 100, 'seu nome completo');
  if (nome.split(/\s+/).length < 2) falhar('Informe nome e sobrenome.');
  const email = texto(c.email, 5, 150, 'seu e-mail').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) falhar('Confira seu e-mail.');
  const cpf = String(c.cpf || '').replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf)) falhar('Informe um CPF com 11 dígitos.');
  const telefone = String(c.telefone || '').replace(/\D/g, '');
  if (!/^\d{10,11}$/.test(telefone)) falhar('Informe telefone com DDD.');
  const a = c.endereco || {};
  const endereco = { zip_code: cep, street_name: texto(a.rua, 2, 150, 'a rua'),
    street_number: texto(a.numero, 1, 20, 'o número'), neighborhood: texto(a.bairro, 2, 100, 'o bairro'),
    city: texto(a.cidade, 2, 100, 'a cidade'), state: texto(a.uf, 2, 2, 'o estado').toUpperCase(),
    complement: typeof a.complemento === 'string' ? texto(a.complemento, 0, 100, 'o complemento') : '' };
  if (!['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(endereco.state)) falhar('Confira a UF.');
  return { nome, email, cpf, telefone, endereco, termosEm: new Date().toISOString(), termosVersao: '2026-10-13' };
}
function itensValidados(body, catalogo = getTodosOsProdutos()) {
  const cotacao = montarCotacao(body, catalogo);
  const itens = body.itens.map(i => {
    const p = catalogo.find(p => p.id === i.id);
    return { id: p.id, nome: p.nome, medida: i.medida, quantidade: i.quantidade,
      centavos: Math.round(embalagens.precos[embalagens.tamanho(i.medida)] * 100) };
  });
  return { cotacao, itens, subtotal: itens.reduce((s, i) => s + i.centavos * i.quantidade, 0), pacotes: embalagens.agrupar(body.itens) };
}
function conferirFrete(opcoes, servico, esperado) {
  const opcao = opcoes.find(o => o.id === String(servico));
  if (!opcao) falhar('A entrega escolhida não está disponível. Volte ao carrinho e calcule novamente.', 409);
  const centavos = Math.round(opcao.preco * 100);
  if (!Number.isFinite(esperado) || Math.round(esperado * 100) !== centavos) {
    const erro = new ErroCheckout('O frete mudou. Confira o novo total antes de continuar.', 409);
    erro.frete = opcao; throw erro;
  }
  return { ...opcao, centavos };
}
async function redis(cmd) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) falhar('O registro de pedidos ainda está sendo configurado.', 503);
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(8000) });
  if (!r.ok) falhar('Não foi possível guardar o pedido. Tente novamente.', 503);
  const d = await r.json(); if (d.error) falhar('Não foi possível guardar o pedido. Tente novamente.', 503);
  return d.result;
}
async function salvar(p) {
  await redis(['SET', prefixo + p.id, JSON.stringify(p), 'EX', ttl]);
  await redis(['ZADD', prefixo + 'lista', Date.parse(p.criadoEm), p.id]);
}
async function buscar(id) {
  if (!/^[a-f0-9]{32}$/.test(id || '')) falhar('Pedido não encontrado.', 404);
  const raw = await redis(['GET', prefixo + id]);
  if (!raw) falhar('Pedido não encontrado ou expirado.', 404);
  return JSON.parse(raw);
}
function autenticar(p, token) {
  if (!/^[a-f0-9]{64}$/.test(token || '') || !crypto.timingSafeEqual(Buffer.from(p.tokenHash, 'hex'), Buffer.from(hash(token), 'hex'))) falhar('Acesso ao pedido não autorizado.', 401);
}
async function mp(path, method = 'GET', body, key) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
  if (!token) falhar('As credenciais de teste ainda não estão disponíveis.', 503);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (key) headers['X-Idempotency-Key'] = key;
  const r = await fetch('https://api.mercadopago.com' + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const erro = new ErroCheckout(r.status === 429 ? 'Aguarde um pouco antes de tentar novamente.' : 'Não foi possível processar o pagamento de teste. Confira os dados ou consulte o pedido antes de tentar outra vez.', 502);
    erro.codigoMP = String(d.error || d.errors?.[0]?.code || r.status).slice(0, 80); throw erro;
  }
  return d;
}
async function configurado() {
  if (process.env.CHECKOUT_TESTE_ATIVO !== 'true') falhar('O pagamento de teste ainda está sendo configurado.', 503);
  if (!process.env.MERCADO_PAGO_PUBLIC_KEY_TEST) falhar('As credenciais de teste ainda não estão disponíveis.', 503);
  // Orders usa APP_USR também em teste: não inferir ambiente pelo prefixo do token.
  const vendedor = await mp('/users/me');
  if (!Array.isArray(vendedor.tags) || !vendedor.tags.includes('test_user')) falhar('O checkout exige uma conta de vendedor de teste. Pagamentos reais estão bloqueados.', 503);
  return String(vendedor.id);
}
async function cotar(payload) {
  if (process.env.FRETE_ATIVO !== 'true' || process.env.MELHOR_ENVIO_AMBIENTE !== 'producao' || !process.env.MELHOR_ENVIO_TOKEN || !process.env.MELHOR_ENVIO_USER_AGENT) falhar('O cálculo de frete não está disponível.', 503);
  const r = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', { method: 'POST', headers: { Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`, 'User-Agent': process.env.MELHOR_ENVIO_USER_AGENT, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
  if (!r.ok) falhar('Não foi possível conferir o frete. Tente novamente.', 502);
  return normalizarOpcoes(await r.json());
}
function metodoValido(d) {
  if (d?.metodo === 'pix') return { id: 'pix', type: 'bank_transfer' };
  const f = d?.formData, tipo = d?.tipo;
  if (!f || !['credit_card', 'debit_card'].includes(tipo)) falhar('Escolha um meio de pagamento válido.');
  return { id: texto(f.payment_method_id, 1, 40, 'o cartão'), type: tipo,
    token: texto(f.token, 1, 200, 'o token do cartão'), installments: (() => {
      const n = Number(f.installments); if (!Number.isInteger(n) || n < 1 || n > 12) falhar('Confira as parcelas.'); return n;
    })(), statement_descriptor: 'HEEEPH' };
}
function payloadPagamento(p, metodo) {
  const nomes = p.cliente.nome.split(/\s+/);
  return { type: 'online', processing_mode: 'automatic', total_amount: dinheiro(p.total), external_reference: p.id,
    description: 'HEEEPH — placas decorativas (TESTE)',
    payer: { email: p.cliente.email, first_name: nomes.shift(), last_name: nomes.join(' '),
      identification: { type: 'CPF', number: p.cliente.cpf },
      phone: { area_code: p.cliente.telefone.slice(0, 2), number: p.cliente.telefone.slice(2) }, address: p.cliente.endereco },
    shipment: { address: p.cliente.endereco },
    items: [...p.itens.map(i => ({ external_code: i.id, title: i.nome + ' ' + i.medida, quantity: i.quantidade, unit_price: dinheiro(i.centavos) })),
      { external_code: 'frete', title: 'Frete — ' + p.frete.transportadora + ' ' + p.frete.servico, quantity: 1, unit_price: dinheiro(p.frete.centavos) }],
    transactions: { payments: [{ amount: dinheiro(p.total), payment_method: metodo, ...(metodo.id === 'pix' ? { expiration_time: 'PT30M' } : {}) }] } };
}
function conferirPagamento(p, d) {
  if (d.external_reference !== p.id || String(d.user_id) !== p.vendedor || Math.round(Number(d.total_amount) * 100) !== p.total || d.country_code !== 'BRA') falhar('O pagamento precisa de conferência. Não envie produtos deste teste.', 502);
  const pagos = d.transactions?.payments || [];
  const aprovado = d.status === 'processed' && d.status_detail === 'accredited' &&
    Math.round(Number(d.total_paid_amount) * 100) === p.total && pagos.length === 1 &&
    pagos[0].status === 'processed' && pagos[0].status_detail === 'accredited';
  return { aprovado, status: String(d.status), detalhe: String(d.status_detail),
    mpId: d.id, atualizadoEm: new Date().toISOString(),
    ...(pagos[0]?.payment_method?.qr_code ? { pix: { codigo: pagos[0].payment_method.qr_code, imagem: pagos[0].payment_method.qr_code_base64 } } : {}) };
}
async function atualizar(p) {
  if (!p.pagamento?.mpId) return p;
  const d = await mp('/v1/orders/' + encodeURIComponent(p.pagamento.mpId));
  p.pagamento = conferirPagamento(p, d); await salvar(p); return p;
}
function publico(p) { return { id: p.id, teste: true, itens: p.itens, subtotal: p.subtotal, frete: p.frete, total: p.total, pacotes: p.pacotes, pagamento: p.pagamento || null }; }
async function preparar(body) {
  const vendedor = await configurado();
  const val = itensValidados(body);
  const cliente = clienteValido(body.cliente, body.cep);
  const frete = conferirFrete(await cotar(val.cotacao), body.servico, body.frete);
  const token = crypto.randomBytes(32).toString('hex');
  const p = { id: crypto.randomBytes(16).toString('hex'), tokenHash: hash(token), criadoEm: new Date().toISOString(), vendedor,
    itens: val.itens, subtotal: val.subtotal, pacotes: val.pacotes, cliente, cotacao: val.cotacao, frete, total: val.subtotal + frete.centavos };
  await salvar(p); return { ...publico(p), token, publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY_TEST };
}
async function pagar(id, token, body) {
  const p = await buscar(id); autenticar(p, token);
  if (p.pagamento?.mpId) return publico(await atualizar(p));
  if (Date.now() - Date.parse(p.criadoEm) > 30 * 60000) falhar('Esta sessão expirou. Volte ao carrinho para conferir os valores.', 409);
  if (await configurado() !== p.vendedor) falhar('A conta de teste mudou. Refaça o pedido.', 409);
  const metodo = metodoValido(body);
  const payload = payloadPagamento(p, metodo), fingerprint = hash(JSON.stringify(payload));
  const tentativaKey = prefixo + 'tentativa:' + id;
  const existente = await redis(['GET', tentativaKey]);
  if (!existente) {
    conferirFrete(await cotar(p.cotacao), p.frete.id, p.frete.preco);
    const venceu = await redis(['SET', tentativaKey, fingerprint, 'NX', 'EX', ttl]);
    if (!venceu && await redis(['GET', tentativaKey]) !== fingerprint) falhar('Já existe uma tentativa. Consulte o pedido antes de tentar novamente.', 409);
  } else if (existente !== fingerprint) falhar('Já existe uma tentativa. Consulte o pedido antes de tentar novamente.', 409);
  const d = await mp('/v1/orders', 'POST', payload, 'heeeph-teste-' + id);
  p.pagamento = conferirPagamento(p, d); await salvar(p); return publico(p);
}
module.exports = { ErroCheckout, clienteValido, itensValidados, conferirFrete, metodoValido, payloadPagamento, conferirPagamento,
  preparar, pagar, buscar, atualizar, autenticar, publico, redis, hash, prefixo, mp, salvar };
