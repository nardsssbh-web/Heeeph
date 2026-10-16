const crypto = require('node:crypto');
// HMAC conforme o validador oficial mercadopago/sdk-nodejs/src/utils/webhook/index.ts.
function diagnosticoAssinatura(req, secret) {
  const id = req.query?.['data.id'];
  const requestId = req.headers['x-request-id'];
  if (!secret) return {valida:false,motivo:'segredo_ausente'};
  if (typeof id !== 'string' || !/^ORD[A-Za-z0-9]+$/.test(id)) return {valida:false,motivo:'id_invalido'};
  if (typeof requestId !== 'string' || !requestId.trim()) return {valida:false,motivo:'request_id_ausente'};
  if (!req.headers['x-signature']) return {valida:false,motivo:'assinatura_ausente'};
  const partes = Object.fromEntries(String(req.headers['x-signature'] || '').split(',').map(p=>p.trim().split('=').map(s=>s.trim())).map(([k,v])=>[k.toLowerCase(),v]));
  if (!/^\d+$/.test(partes.ts || '') || !/^[a-f0-9]{64}$/i.test(partes.v1 || '')) return {valida:false,motivo:'formato_invalido'};
  const esperado = crypto.createHmac('sha256',secret).update(`id:${id};request-id:${requestId.trim()};ts:${partes.ts};`).digest('hex');
  const valida=crypto.timingSafeEqual(Buffer.from(esperado),Buffer.from(partes.v1.toLowerCase()));
  if (valida) return {valida:true,motivo:'confirmada'};
  // Diagnóstico booleano; não aceitar variante não documentada nem expor hashes.
  const minuscula=crypto.createHmac('sha256',secret).update(`id:${id.toLowerCase()};request-id:${requestId.trim()};ts:${partes.ts};`).digest('hex');
  return {valida:false,motivo:'assinatura_divergente',varianteMinusculaConfere:crypto.timingSafeEqual(Buffer.from(minuscula),Buffer.from(partes.v1.toLowerCase()))};
}
function assinaturaValida(req,secret){return diagnosticoAssinatura(req,secret).valida;}
module.exports={assinaturaValida,diagnosticoAssinatura};

