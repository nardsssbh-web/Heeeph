// O receptor usa somente a conexão gerenciada pela integração Vercel.
// Não recair nas cópias manuais antigas quando a rotação estiver incompleta.
module.exports = function configurarConexao(env = process.env) {
  env.KV_REST_API_URL = env.RECEPTOR_KV_REST_API_URL || '';
  env.KV_REST_API_TOKEN = env.RECEPTOR_KV_REST_API_TOKEN || '';
  delete env.UPSTASH_REDIS_REST_URL;
  delete env.UPSTASH_REDIS_REST_TOKEN;
};
