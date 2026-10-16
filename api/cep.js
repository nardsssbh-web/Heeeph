const {consultarCEP,ErroCEP}=require('../lib/cep');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({mensagem:'Método não permitido.'});}
  try{return res.json(await consultarCEP(req.query?.cep));}
  catch(e){return res.status(e instanceof ErroCEP?e.status:503).json({mensagem:e instanceof ErroCEP?e.message:'Não foi possível conferir o CEP agora.'});}
};
