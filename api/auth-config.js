// Chave publicável do projeto de TESTES heeeph-clientes (não é secreta).
// Este fallback existe SOMENTE nesta branch de Preview.
// Nunca adicionar service_role, secret keys ou tokens administrativos.
module.exports = function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  const url=process.env.SUPABASE_URL || "https://djefvcrhaafqrtjddxau.supabase.co";
  const key=process.env.SUPABASE_ANON_KEY || "sb_publishable_FDx-gkxZP1FcyPL2_3etGQ_Z8XNdc3K";
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) {
    return res.status(503).json({configured:false});
  }
  return res.status(200).json({configured:true,url,key});
};
