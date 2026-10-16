const crypto = require('node:crypto');
// HMAC conforme o SDK oficial; IDs alfanuméricos também são assinados em minúsculas.
function diagnosticoAssinatura(req, secret) {
  const id = req.query?.['data.id'];
  const recebido = req.headers['x-request-id'];
  const requestId = typeof recebido === 'string' ? recebido.trim() : '';
  if (!secret) return {valida:false,motivo:'segredo_ausente'};
  if (typeof id !== 'string' || !/^ORD[A-Za-z0-9]+$/.test(id)) return {valida:false,motivo:'id_invalido'};
  if (recebido != null && typeof recebido !== 'string') return {valida:false,motivo:'request_id_invalido'};
  if (!req.headers['x-signature']) return {valida:false,motivo:'assinatura_ausente'};
  const partes = Object.fromEntries(String(req.headers['x-signature'] || '').split(',').map(p=>p.trim().split('=').map(s=>s.trim())).map(([k,v])=>[k.toLowerCase(),v]));
  if (!/^\d+$/.test(partes.ts || '') || !/^[a-f0-9]{64}$/i.test(partes.v1 || '')) return {valida:false,motivo:'formato_invalido'};
  // O SDK oficial omite do manifesto pares opcionais ausentes. O HMAC continua obrigatório.
  const sufixo=`${requestId?'request-id:'+requestId+';':''}ts:${partes.ts};`;
  const esperado = crypto.createHmac('sha256',secret).update(`id:${id};${sufixo}`).digest('hex');
  const valida=crypto.timingSafeEqual(Buffer.from(esperado),Buffer.from(partes.v1.toLowerCase()));
  if (valida) return {valida:true,motivo:'confirmada'};
  // O envio automático usa o ID em minúsculas; o simulador pode usar o original.
  // Normalizar apenas o manifesto. Consultar/persistir sempre com o ID original.
  // Ambas as formas exigem HMAC completo com o mesmo segredo, request ID e timestamp.
  const minuscula=crypto.createHmac('sha256',secret).update(`id:${id.toLowerCase()};${sufixo}`).digest('hex');
  if (crypto.timingSafeEqual(Buffer.from(minuscula),Buffer.from(partes.v1.toLowerCase()))) return {valida:true,motivo:'confirmada',idNormalizado:true};
  return {valida:false,motivo:'assinatura_divergente',requestIdPresente:Boolean(requestId),varianteMinusculaConfere:false};
}
function assinaturaValida(req,secret){return diagnosticoAssinatura(req,secret).valida;}
module.exports={assinaturaValida,diagnosticoAssinatura};

