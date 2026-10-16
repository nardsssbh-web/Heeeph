const crypto = require('node:crypto');
const { ambiente } = require('./ambiente');
const { montarCotacao, normalizarOpcoes, ErroFrete } = require('./frete');
const embalagens = require('../js/embalagens');
const { getTodosOsProdutos } = require('../produtos');
class ErroCheckout extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const falhar = (message, status) => { throw new ErroCheckout(message, status); };
const hash = valor => crypto.createHash('sha256').update(String(valor)).digest('hex');
const dinheiro = centavos => (centavos / 100).toFixed(2);
const centavosMP = valor => /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(String(valor)) ? Math.round(Number(valor) * 100) : NaN;
const prefixoAtual = () => ambiente().prefixo;
const expiracao = () => ambiente().ttl ? ['EX', ambiente().ttl] : [];
function exigirAmbiente(p) {
  if ((p.ambiente || 'teste') !== ambiente().nome) falhar('Pedido de outro ambiente.', 409);
}
async function exclusivo(id, tarefa) {
  if (!/^[a-f0-9]{32}$/.test(id || '')) falhar('Pedido não encontrado.', 404);
  const key = prefixoAtual() + 'lock:' + id, dono = crypto.randomBytes(16).toString('hex');
  // A função Vercel tem duração máxima de 60s; o bloqueio sobrevive a esse prazo.
  if (!await redis(['SET', key, dono, 'NX', 'EX', 180])) falhar('Pedido em atualização. Aguarde e consulte novamente.', 409);
  try { return await tarefa(); }
  finally { await redis(['EVAL', "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, key, dono]); }
}
function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  return [9, 10].every(n => {
    const soma = [...cpf.slice(0,n)].reduce((s,d,i) => s + Number(d) * (n + 1 - i), 0);
    return Number(cpf[n]) === ((soma * 10) % 11) % 10;
  });
}
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
  if (ambiente().teste && !email.endsWith('@testuser.com')) falhar('Use o e-mail do comprador de teste do Mercado Pago, terminado em @testuser.com.');
  if (!ambiente().teste && email.endsWith('@testuser.com')) falhar('Informe o e-mail do comprador.');
  const cpf = String(c.cpf || '').replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf)) falhar('Informe um CPF com 11 dígitos.');
  if (!ambiente().teste && !cpfValido(cpf)) falhar('Confira o CPF.');
  if (!/^\d{8}$/.test(cep || '')) falhar('Confira o CEP.');
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
  const { redisUrl: url, redisToken: token } = ambiente();
  if (!url || !token) falhar('O registro de pedidos ainda está sendo configurado.', 503);
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(8000) });
  if (!r.ok) falhar('Não foi possível guardar o pedido. Tente novamente.', 503);
  const d = await r.json(); if (d.error) falhar('Não foi possível guardar o pedido. Tente novamente.', 503);
  return d.result;
}
async function salvar(p) {
  exigirAmbiente(p);
  await redis(['SET', prefixoAtual() + p.id, JSON.stringify(p), ...expiracao()]);
  await redis(['ZADD', prefixoAtual() + 'lista', Date.parse(p.criadoEm), p.id]);
}
async function buscar(id) {
  if (!/^[a-f0-9]{32}$/.test(id || '')) falhar('Pedido não encontrado.', 404);
  const raw = await redis(['GET', prefixoAtual() + id]);
  if (!raw) falhar('Pedido não encontrado ou expirado.', 404);
  const p = JSON.parse(raw); exigirAmbiente(p); return p;
}
function autenticar(p, token) {
  if (!/^[a-f0-9]{64}$/.test(token || '') || !crypto.timingSafeEqual(Buffer.from(p.tokenHash, 'hex'), Buffer.from(hash(token), 'hex'))) falhar('Acesso ao pedido não autorizado.', 401);
}
async function mp(path, method = 'GET', body, key) {
  const token = ambiente().accessToken;
  if (!token) falhar('As credenciais de teste ainda não estão disponíveis.', 503);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (key) headers['X-Idempotency-Key'] = key;
  const r = await fetch('https://api.mercadopago.com' + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const codigo = String(d.errors?.[0]?.code || d.error || r.status).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80);
    console.error('MP_ERRO', JSON.stringify({ endpoint: path.split('?')[0], http: r.status, codigo }));
    // 402 pode conter uma order criada com transação recusada: preservar seu ID.
    if (r.status === 402 && /^ORD[A-Za-z0-9]+$/.test(d.id || '') && d.external_reference) return d;
    const mensagens = {
      invalid_email_for_sandbox: 'Use o e-mail do comprador de teste terminado em @testuser.com.',
      invalid_credentials: 'Configure as credenciais da aplicação do vendedor de teste. A API Orders não aceita credenciais TEST da conta real.',
      forbidden: 'A aplicação do vendedor de teste não tem permissão para criar esse pagamento.',
      resource_locked: 'O Mercado Pago está conferindo esta tentativa. Aguarde e consulte o pagamento.',
      idempotency_key_already_used: 'Esta tentativa já foi recebida. Consulte o pagamento antes de continuar.'
    };
    const erro = new ErroCheckout(mensagens[codigo] || (r.status === 429
      ? 'Limite de consultas atingido. Aguarde um pouco.'
      : 'O Mercado Pago não concluiu o pagamento de teste. Código: ' + codigo + '.'), 502);
    erro.codigoMP = codigo;
    erro.httpMP = r.status;
    // Apenas erros explícitos de validação/autorização garantem que não houve criação.
    erro.semCriacao = !d.id && [400, 401, 403].includes(r.status);
    throw erro;
  }
  return d;
}
async function configurado(cobranca = true) {
  const a = ambiente();
  if (cobranca && !a.ativo) falhar('O pagamento está desativado neste ambiente.', 503);
  if (!a.publicKey) falhar('As credenciais ainda não estão disponíveis.', 503);
  if (!a.teste && (process.env.VERCEL_ENV !== 'production' || !a.webhookSecret || !/^\d+$/.test(a.vendedor || '') || !a.redisUrl || !a.redisToken)) falhar('Produção exige hospedagem, vendedor, webhook e banco exclusivos configurados.', 503);
  // Orders usa APP_USR também em teste: não inferir ambiente pelo prefixo do token.
  const vendedor = await mp('/users/me');
  const teste = Array.isArray(vendedor.tags) && vendedor.tags.includes('test_user');
  if (a.teste && !teste) falhar('O checkout exige uma conta de vendedor de teste. Pagamentos reais estão bloqueados.', 503);
  if (!a.teste && (teste || String(vendedor.id) !== a.vendedor)) falhar('Confira a conta do vendedor de produção.', 503);
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
    description: 'HEEEPH — placas decorativas' + (ambiente().teste ? ' (TESTE)' : ''),
    payer: { email: p.cliente.email, first_name: nomes.shift(), last_name: nomes.join(' '),
      identification: { type: 'CPF', number: p.cliente.cpf },
      phone: { area_code: p.cliente.telefone.slice(0, 2), number: p.cliente.telefone.slice(2) }, address: p.cliente.endereco },
    shipment: { address: p.cliente.endereco },
    items: [...p.itens.map(i => ({ external_code: i.id, title: i.nome + ' ' + i.medida, quantity: i.quantidade, unit_price: dinheiro(i.centavos) })),
      { external_code: 'frete', title: 'Frete — ' + p.frete.transportadora + ' ' + p.frete.servico, quantity: 1, unit_price: dinheiro(p.frete.centavos) }],
    transactions: { payments: [{ amount: dinheiro(p.total), payment_method: metodo, ...(metodo.id === 'pix' ? { expiration_time: 'PT30M' } : {}) }] } };
}
function conferirPagamento(p, d) {
  exigirAmbiente(p);
  if (!/^ORD[A-Za-z0-9]+$/.test(d.id || '') || (p.pagamento?.mpId && p.pagamento.mpId !== d.id) || (p.mpRecuperacao && p.mpRecuperacao !== d.id)) falhar('Identificador de pagamento divergente.', 409);
  if (d.external_reference !== p.id || (d.user_id != null && String(d.user_id) !== p.vendedor) || centavosMP(d.total_amount) !== p.total || d.country_code !== 'BRA') falhar('O pagamento precisa de conferência. Não envie os produtos antes da confirmação.', 502);
  const pagos = d.transactions?.payments || [];
  const aprovado = d.status === 'processed' && d.status_detail === 'accredited' &&
    centavosMP(d.total_paid_amount) === p.total && pagos.length === 1 &&
    (pagos[0].amount == null ? ambiente().teste : centavosMP(pagos[0].amount) === p.total) &&
    (pagos[0].paid_amount == null ? ambiente().teste : centavosMP(pagos[0].paid_amount) === p.total) &&
    pagos[0].status === 'processed' && pagos[0].status_detail === 'accredited';
  const trocaPermitida = d.status === 'failed' && pagos.length === 1 && pagos[0].status === 'failed' &&
    (d.total_paid_amount == null || centavosMP(d.total_paid_amount) === 0) &&
    (pagos[0].paid_amount == null || centavosMP(pagos[0].paid_amount) === 0);
  return { aprovado, trocaPermitida, status: String(d.status), detalhe: String(d.status_detail),
    mpId: d.id, atualizadoEm: new Date().toISOString(),
    transacoes: pagos.map(t => {
      const codigo = v => typeof v === 'string' ? v.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 100) : '';
      return { status: codigo(t.status), detalhe: codigo(t.status_detail), metodo: codigo(t.payment_method?.id) };
    }),
    ...(pagos[0]?.payment_method?.id === 'pix' ? { pix: {
      codigo: typeof pagos[0].payment_method.qr_code === 'string' ? pagos[0].payment_method.qr_code : '',
      imagem: typeof pagos[0].payment_method.qr_code_base64 === 'string' ? pagos[0].payment_method.qr_code_base64 : ''
    } } : {}) };
}
async function atualizar(p) {
  if (await configurado(false) !== p.vendedor) falhar('A conta mudou. Confira a configuração do vendedor.', 409);
  const mpId = p.pagamento?.mpId || p.mpRecuperacao;
  if (mpId) {
    const d = await mp('/v1/orders/' + encodeURIComponent(mpId));
    p.pagamento = conferirPagamento(p, d); await salvar(p); return p;
  }
  if (!await redis(['GET', prefixoAtual() + 'tentativa:' + p.id])) return p;
  const parametros = new URLSearchParams({
    begin_date: new Date(Date.parse(p.criadoEm) - 60000).toISOString(),
    end_date: new Date().toISOString(), external_reference: p.id, type: 'online', page: '1', page_size: '20'
  });
  const d = await mp('/v1/orders?' + parametros);
  if (!Array.isArray(d.data)) falhar('Não foi possível conferir a tentativa no Mercado Pago.', 502);
  const encontrados = d.data.filter(o => o.external_reference === p.id);
  if (encontrados.length > 1) falhar('Há mais de um pagamento para este pedido. Confira no Mercado Pago.', 409);
  if (encontrados.length === 1) {
    p.mpRecuperacao = encontrados[0].id; await salvar(p);
    const order = await mp('/v1/orders/' + encodeURIComponent(p.mpRecuperacao));
    p.pagamento = conferirPagamento(p, order); await salvar(p);
  }
  // Busca vazia não prova ausência de cobrança. Manter proteção contra duplicação.
  return p;
}
function publico(p) { return { id: p.id, teste: ambiente().teste, ambiente: ambiente().nome, itens: p.itens, subtotal: p.subtotal, frete: p.frete,
  total: p.total, pacotes: p.pacotes, pagamento: p.pagamento || null,
  publicKey: ambiente().publicKey,
  ultimaFalha: p.ultimaFalha || null, expirado: Date.now() - Date.parse(p.criadoEm) > 30 * 60000 }; }
async function status(id, token) {
  const p = await buscar(id); autenticar(p, token);
  const atualizado = await atualizar(p);
  const fingerprint = await redis(['GET', prefixoAtual() + 'tentativa:' + id]);
  return { ...publico(atualizado), tentativa: !atualizado.pagamento && Boolean(fingerprint),
    recuperarPix: !atualizado.pagamento && fingerprint === hash(JSON.stringify(payloadPagamento(atualizado, {id:'pix',type:'bank_transfer'}))) };
}
async function liberarNovaCompra(id, token) {
  const p=await buscar(id); autenticar(p,token);
  const atual=await atualizar(p);
  if(!atual.pagamento?.trocaPermitida) falhar('Ainda não é seguro trocar o pagamento. Consulte esta tentativa antes de continuar.',409);
  return { checkout: { cep:atual.cliente.endereco.zip_code,
    itens:atual.itens.map(({id,medida,quantidade})=>({id,medida,quantidade})),
    servico:atual.frete.id, frete:atual.frete.centavos/100 } };
}
async function recuperarPix(id, token) {
  const p = await buscar(id); autenticar(p, token);
  if (await configurado() !== p.vendedor) falhar('A conta de teste mudou. Confira a configuração.', 409);
  if (p.pagamento || p.mpRecuperacao) return publico(await atualizar(p));
  if (Date.now() - Date.parse(p.criadoEm) > 30 * 60000) falhar('Tentativa antiga: consulte o pagamento ou solicite conferência à loja. O Pix não será reenviado.',409);
  const payload = payloadPagamento(p, {id:'pix',type:'bank_transfer'}), fingerprint = hash(JSON.stringify(payload));
  if (await redis(['GET',prefixoAtual()+'tentativa:'+id]) !== fingerprint) falhar('Esta tentativa não pode ser recuperada como Pix. Consulte o pagamento.',409);
  return enviarPagamento(p, payload, p.proximaChave || 'heeeph-' + ambiente().nome + '-'+id, fingerprint);
}

async function preparar(body, identidade) {
  const vendedor = await configurado();
  const val = itensValidados(body);
  const cliente = clienteValido(body.cliente, body.cep);
  const frete = conferirFrete(await cotar(val.cotacao), body.servico, body.frete);
  const token = identidade.token;
  const p = { id: identidade.id, preparacaoHash: identidade.fingerprint, ambiente: ambiente().nome, tokenHash: hash(token), criadoEm: new Date().toISOString(), vendedor,
    itens: val.itens, subtotal: val.subtotal, pacotes: val.pacotes, cliente, cotacao: val.cotacao, frete, total: val.subtotal + frete.centavos };
  await salvar(p); return { ...publico(p), token };
}
async function prepararIdempotente(body) {
  if (!/^[a-f0-9]{64}$/.test(body?.chavePreparacao || '')) falhar('Reabra o checkout para identificar esta tentativa.');
  const chave = body.chavePreparacao;
  const id = hash(ambiente().nome + '|pedido|' + chave).slice(0,32), token = hash('acesso|' + chave);
  const fingerprint = hash(JSON.stringify({itens:body.itens,cep:body.cep,servico:body.servico,frete:body.frete,cliente:body.cliente}));
  return exclusivo(id, async () => {
    let anterior;
    try { anterior = await buscar(id); } catch(e) { if(e.status !== 404) throw e; }
    if (anterior) {
      autenticar(anterior,token);
      if (anterior.preparacaoHash !== fingerprint) falhar('Esta tentativa já identifica outro pedido. Recupere o pedido original.',409);
      await salvar(anterior); // Repara também o índice se a resposta anterior se perdeu após o SET.
      return { ...publico(anterior), token };
    }
    return preparar(body, {id,token,fingerprint});
  });
}
async function notificar(mpId) {
  const d = await mp('/v1/orders/' + encodeURIComponent(mpId));
  if(d.id !== mpId) falhar('Notificação divergente.',409);
  return exclusivo(d.external_reference, async () => {
    const p = await buscar(d.external_reference);
    // Reconsulta dentro do bloqueio: um evento antigo nunca sobrescreve o estado atual.
    if ((p.pagamento?.mpId || p.mpRecuperacao || mpId) !== mpId) falhar('Notificação de outro pagamento.',409);
    p.mpRecuperacao ||= mpId;
    return atualizar(p);
  });
}
async function pagar(id, token, body) {
  const p = await buscar(id); autenticar(p, token);
  if (p.pagamento?.mpId || p.mpRecuperacao) return publico(await atualizar(p));
  if (Date.now() - Date.parse(p.criadoEm) > 30 * 60000) falhar('Esta sessão expirou. Volte ao carrinho para conferir os valores.', 409);
  if (await configurado() !== p.vendedor) falhar('A conta de teste mudou. Refaça o pedido.', 409);
  const metodo = metodoValido(body);
  const payload = payloadPagamento(p, metodo), fingerprint = hash(JSON.stringify(payload));
  const tentativaKey = prefixoAtual() + 'tentativa:' + id;
  if (await redis(['GET', tentativaKey])) falhar('Já existe uma tentativa. Consulte o pagamento para recuperar o resultado.', 409);
  conferirFrete(await cotar(p.cotacao), p.frete.id, p.frete.preco);
  const venceu = await redis(['SET', tentativaKey, fingerprint, 'NX', ...expiracao()]);
  if (!venceu) falhar('Já existe uma tentativa. Consulte o pagamento para recuperar o resultado.', 409);
  const chave = p.proximaChave || 'heeeph-' + ambiente().nome + '-' + id;
  return enviarPagamento(p, payload, chave, fingerprint);
}
async function enviarPagamento(p, payload, chave, fingerprint) {
  const tentativaKey = prefixoAtual() + 'tentativa:' + p.id;
  try {
    const d = await mp('/v1/orders', 'POST', payload, chave);
    // Guardar ID antes da conferência evita perder a order se houver falha posterior.
    if (!/^ORD[A-Za-z0-9]+$/.test(d.id || '')) falhar('O Mercado Pago não retornou o identificador. Consulte a tentativa.', 502);
    p.mpRecuperacao = d.id; p.ultimaFalha = null; await salvar(p);
    p.pagamento = conferirPagamento(p, d); await salvar(p); return publico(p);
  } catch (e) {
    if (e.semCriacao) {
      p.ultimaFalha = { mensagem: e.message, codigo: e.codigoMP };
      p.proximaChave = 'heeeph-' + ambiente().nome + '-' + crypto.randomBytes(16).toString('hex');
      await salvar(p);
      await redis(['EVAL', "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, tentativaKey, fingerprint]);
    }
    // Timeout, 402 sem ID, 409, 429 e 5xx permanecem em conferência.
    throw e;
  }
}
module.exports = { ErroCheckout, clienteValido, cpfValido, itensValidados, conferirFrete, metodoValido, payloadPagamento, conferirPagamento,
  liberarNovaCompra: (id,token) => exclusivo(id,()=>liberarNovaCompra(id,token)),
  recuperarPix: (id, token) => exclusivo(id, () => recuperarPix(id, token)), configurado, ErroFrete,
  status: (id, token) => exclusivo(id, () => status(id, token)), preparar: prepararIdempotente, notificar,
  pagar: (id, token, body) => exclusivo(id, () => pagar(id, token, body)), buscar,
  atualizar: p => exclusivo(p.id, async () => atualizar(await buscar(p.id))),
  exclusivo, expiracao, ambiente, autenticar, publico, redis, hash, mp, salvar };
Object.defineProperty(module.exports, 'prefixo', { get: prefixoAtual });

