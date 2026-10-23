const c = require('../lib/checkout');
const {ErroCEP}=require('../lib/cep');
const { origemPreparacao } = require('../lib/hospedagem');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ mensagem:'Método não permitido.' }); }
  try {
    const origens = ['https://heeeph.com.br','https://www.heeeph.com.br'];
    const temporaria = origemPreparacao();
    if (temporaria) origens.push(temporaria);
    if (process.env.VERCEL_ENV === 'preview') {
      for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
        if (/^[a-z0-9-]+\.vercel\.app$/.test(host || '')) origens.push('https://' + host);
      }
    }
    if (req.headers.origin && !origens.includes(req.headers.origin)) throw new c.ErroCheckout('Origem não autorizada.',403);
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!b || JSON.stringify(b).length > 20000) throw new c.ErroCheckout('Confira os dados do pedido.');
    const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (b.acao === 'configuracao') return res.json({ teste:c.ambiente().teste });
    if (b.acao === 'preparar') return res.json(await c.preparar(b));
    if (b.acao === 'pagar') return res.json(await c.pagar(b.id, token, b));
    if (b.acao === 'recuperarPix') return res.json(await c.recuperarPix(b.id, token));
    if (b.acao === 'status') return res.json(await c.status(b.id, token));
    if (b.acao === 'abandonarPedido') return res.json(await c.abandonarPedido(b.id, token, b));
    if (b.acao === 'liberarNovaCompra') return res.json(await c.liberarNovaCompra(b.id, token));
    throw new c.ErroCheckout('Ação não permitida.');
  } catch (e) {
    const conhecido = e instanceof c.ErroCheckout || e instanceof c.ErroFrete || e instanceof ErroCEP;
    return res.status(e instanceof SyntaxError ? 400 : conhecido ? e.status : e.status === 422 ? 422 : 502).json({
      mensagem: conhecido ? e.message : e instanceof SyntaxError ? 'Confira os dados do pedido.' : 'Não foi possível concluir. Consulte o pedido antes de repetir o pagamento.',
      ...(e.frete ? { frete:e.frete } : {}), ...(e.campo ? {campo:e.campo} : {}), ...(e.codigoMP ? { codigo:e.codigoMP } : {}) });
  }
};

