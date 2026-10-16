const { diagnosticoAssinatura } = require('../../lib/webhook');

// Somente reconciliação: nenhuma rota de criação de pedido ou pagamento.
module.exports = function criarReceptor(checkout) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'POST') return res.status(405).end();
    const a = checkout.ambiente();
    const log = (resultado, http, assinaturaValidada = false) => console.info('MP_WEBHOOK_TESTE', JSON.stringify({ resultado, http, assinaturaValidada }));
    if (!a.teste || a.nome !== 'teste' || process.env.CHECKOUT_PRODUCAO_ATIVO === 'true' || !a.webhookSecret) {
      log('configuracao_bloqueada', 503);
      return res.status(503).json({ erro: 'Receptor de teste ainda não configurado.' });
    }
    const assinatura=diagnosticoAssinatura(req,a.webhookSecret);
    if (!assinatura.valida) {
      console.info('MP_WEBHOOK_TESTE_ASSINATURA',JSON.stringify(assinatura));
      log('assinatura_invalida', 401);
      return res.status(401).json({ assinaturaValidada: false });
    }
    if (!a.accessToken || !a.publicKey || !a.redisUrl || !a.redisToken) {
      log('credenciais_ausentes', 503, true);
      return res.status(503).json({ assinaturaValidada: true, processado: false });
    }
    try {
      // Confirmar vendedor de teste antes mesmo de consultar a order recebida.
      const vendedor = await checkout.configurado(false);
      console.info('MP_WEBHOOK_TESTE_CONTA', JSON.stringify({ vendedor, teste: true, assinaturaValidada: true }));
    } catch {
      log('vendedor_teste_nao_confirmado', 503, true);
      return res.status(503).json({ assinaturaValidada: true, processado: false });
    }
    try {
      const p = await checkout.notificar(req.query['data.id'], { assinaturaValidada: true });
      if (!p.webhookRecebido?.assinaturaValidada) throw new Error('Persistência não confirmada.');
      log('processado_e_persistido', 200, true);
      return res.status(200).json({ assinaturaValidada: true, processado: true, pedido: p.id, status: p.pagamento?.status, recebidoEm: p.webhookRecebido.em });
    } catch {
      log('falha_na_conferencia', 503, true);
      return res.status(503).json({ assinaturaValidada: true, processado: false });
    }
  };
};
