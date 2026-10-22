const { montarCotacao, normalizarOpcoes, ErroFrete } = require('../lib/frete.js');
const { hospedagem } = require('../lib/hospedagem');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ mensagem: 'Método não permitido.' });
  }
  try {
    if (process.env.FRETE_ATIVO !== 'true' || !process.env.MELHOR_ENVIO_TOKEN ||
        !process.env.MELHOR_ENVIO_USER_AGENT) {
      throw new ErroFrete('O cálculo automático ainda não está disponível. Confirme o frete pelo WhatsApp.', 503);
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const payload = montarCotacao(body);
    const sandbox = process.env.MELHOR_ENVIO_AMBIENTE !== 'producao';
    // Cotações de teste nunca devem ser oferecidas no site público de produção.
    if (sandbox && (hospedagem().producao || process.env.CHECKOUT_AMBIENTE === 'producao')) {
      throw new ErroFrete('Confirme o frete deste pedido pelo WhatsApp.', 503);
    }
    const host = sandbox ? 'sandbox.melhorenvio.com.br' : 'melhorenvio.com.br';
    const resposta = await fetch(`https://${host}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
        'User-Agent': process.env.MELHOR_ENVIO_USER_AGENT,
        Accept: 'application/json', 'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000)
    });
    if (!resposta.ok) throw new ErroFrete('Não foi possível consultar o frete agora. Tente novamente ou fale pelo WhatsApp.', 502);
    const opcoes = normalizarOpcoes(await resposta.json());
    return res.status(200).json({ opcoes, teste: sandbox });
  } catch (erro) {
    if (erro instanceof SyntaxError) return res.status(400).json({ mensagem: 'Confira os dados do pedido.' });
    return res.status(erro instanceof ErroFrete ? erro.status : 502).json({
      mensagem: erro instanceof ErroFrete ? erro.message : 'Não foi possível consultar o frete agora. Tente novamente ou fale pelo WhatsApp.'
    });
  }
};

