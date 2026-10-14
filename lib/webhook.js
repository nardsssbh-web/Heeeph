const crypto = require('node:crypto');
// HMAC conforme o validador oficial mercadopago/sdk-nodejs/src/utils/webhook/index.ts.
function assinaturaValida(req, secret) {
  const id = req.query?.['data.id'];
  const requestId = req.headers['x-request-id'];
  if (!secret || typeof id !== 'string' || !/^ORD[A-Za-z0-9]+$/.test(id) || typeof requestId !== 'string') return false;
  const partes = Object.fromEntries(String(req.headers['x-signature'] || '').split(',').map(p=>p.trim().split('=').map(s=>s.trim())).map(([k,v])=>[k.toLowerCase(),v]));
  if (!/^\d+$/.test(partes.ts || '') || !/^[a-f0-9]{64}$/i.test(partes.v1 || '')) return false;
  const esperado = crypto.createHmac('sha256',secret).update(`id:${id};request-id:${requestId.trim()};ts:${partes.ts};`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(esperado),Buffer.from(partes.v1.toLowerCase()));
}
module.exports={assinaturaValida};

