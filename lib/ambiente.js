// Nenhum segredo é devolvido ao navegador. Produção exige liberação explícita.
function ambiente() {
  const nome = process.env.CHECKOUT_AMBIENTE || 'teste';
  if (!['teste', 'producao'].includes(nome)) throw Object.assign(new Error('Ambiente de checkout inválido.'), { status: 503 });
  const teste = nome === 'teste';
  return {
    nome, teste, prefixo: `heeeph:${nome}:`, ttl: teste ? 30 * 86400 : null,
    ativo: process.env[teste ? 'CHECKOUT_TESTE_ATIVO' : 'CHECKOUT_PRODUCAO_ATIVO'] === 'true',
    accessToken: process.env[teste ? 'MERCADO_PAGO_ACCESS_TOKEN_TEST' : 'MERCADO_PAGO_ACCESS_TOKEN_PROD'],
    publicKey: process.env[teste ? 'MERCADO_PAGO_PUBLIC_KEY_TEST' : 'MERCADO_PAGO_PUBLIC_KEY_PROD'],
    webhookSecret: process.env[teste ? 'MERCADO_PAGO_WEBHOOK_SECRET_TEST' : 'MERCADO_PAGO_WEBHOOK_SECRET_PROD'],
    vendedor: process.env.MERCADO_PAGO_VENDEDOR_ID_PROD,
    redisUrl: teste ? process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL : process.env.UPSTASH_REDIS_REST_URL_PROD,
    redisToken: teste ? process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN : process.env.UPSTASH_REDIS_REST_TOKEN_PROD
  };
}
module.exports = { ambiente };
