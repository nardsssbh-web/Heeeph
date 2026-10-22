// Configuração do servidor, nunca derivada de Host ou de cabeçalhos do cliente.
function hospedagem(env = process.env) {
  if ((env.HEEEPH_HOSPEDAGEM && !['vercel', 'hostinger'].includes(env.HEEEPH_HOSPEDAGEM)) ||
      (env.HEEEPH_HOSPEDAGEM === 'hostinger' && env.VERCEL_ENV)) return {
    provedor: 'conflito', nome: 'bloqueado', producao: env.VERCEL_ENV === 'production', permiteProducao: false
  };
  // A identificação de sistema da Vercel tem prioridade sobre opções manuais.
  if (env.VERCEL_ENV) return {
    provedor: 'vercel', nome: env.VERCEL_ENV,
    producao: env.VERCEL_ENV === 'production',
    permiteProducao: env.VERCEL_ENV === 'production'
  };
  if (env.HEEEPH_HOSPEDAGEM === 'hostinger') return {
    provedor: 'hostinger', nome: 'preparacao', producao: false,
    // Este pacote foi autorizado apenas para preparação. Nenhuma flag o libera.
    permiteProducao: false
  };
  return { provedor: 'local', nome: 'development', producao: false, permiteProducao: false };
}

function origemPreparacao(env = process.env) {
  if (hospedagem(env).provedor !== 'hostinger') return null;
  try {
    const u = new URL(env.HEEEPH_ORIGEM_PREPARACAO);
    if (u.protocol !== 'https:' || u.port || u.username || u.password ||
        u.pathname !== '/' || u.search || u.hash ||
        !/^[a-z0-9-]+\.hostingersite\.com$/.test(u.hostname)) return null;
    return u.origin;
  } catch { return null; }
}

module.exports = { hospedagem, origemPreparacao };
