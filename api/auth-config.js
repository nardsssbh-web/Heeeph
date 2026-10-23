// Apenas a chave pública (anon/publishable) pode chegar ao navegador.
// Nunca exponha service_role, secret keys ou tokens administrativos.
module.exports = function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  const url=process.env.SUPABASE_URL || "";
  const key=process.env.SUPABASE_ANON_KEY || "";
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) {
    return res.status(503).json({configured:false});
  }
  return res.status(200).json({configured:true,url,key});
};
