const c = require('../lib/checkout');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ mensagem:'Método não permitido.' }); }
  try {
    if (req.headers.origin && req.headers.origin !== 'https://heeeph.com.br' && req.headers.origin !== 'https://www.heeeph.com.br') throw new c.ErroCheckout('Origem não autorizada.',403);
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!b || JSON.stringify(b).length > 20000) throw new c.ErroCheckout('Confira os dados do pedido.');
    const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (b.acao === 'preparar') return res.json(await c.preparar(b));
    if (b.acao === 'pagar') return res.json(await c.pagar(b.id, token, b));
    if (b.acao === 'recuperarPix') return res.json(await c.recuperarPix(b.id, token));
    if (b.acao === 'status') return res.json(await c.status(b.id, token));
    throw new c.ErroCheckout('Ação não permitida.');
  } catch (e) {
    const conhecido = e instanceof c.ErroCheckout || e instanceof c.ErroFrete;
    return res.status(e instanceof SyntaxError ? 400 : conhecido ? e.status : e.status === 422 ? 422 : 502).json({
      mensagem: conhecido ? e.message : e instanceof SyntaxError ? 'Confira os dados do pedido.' : 'Não foi possível concluir o teste. Tente novamente ou volte ao carrinho.',
      ...(e.frete ? { frete:e.frete } : {}), ...(e.codigoMP ? { codigo:e.codigoMP } : {}) });
  }
};
