const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/checkout');
test('Preview aceita somente URL exata do deploy e alias oficial da branch, sem liberar outros previews',async()=>{
 const anterior={...process.env};
 Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_URL:'heeeph-abc.vercel.app',VERCEL_BRANCH_URL:'heeeph-git-codex-preparacao-vendas-equipe.vercel.app'});
 const consultar=async(origin)=>{let status=200,body;const res={setHeader(){},status(n){status=n;return this;},json(d){body=d;return this;}};await handler({method:'POST',headers:{origin},body:{acao:'configuracao'}},res);return {status,body};};
 try{
  assert.equal((await consultar('https://'+process.env.VERCEL_URL)).status,200);
  assert.equal((await consultar('https://'+process.env.VERCEL_BRANCH_URL)).status,200);
  assert.equal((await consultar('https://outro.vercel.app')).status,403);
  assert.equal((await consultar('https://'+process.env.VERCEL_BRANCH_URL+'.atacante.com')).status,403);
  process.env.VERCEL_ENV='production';
  assert.equal((await consultar('https://'+process.env.VERCEL_BRANCH_URL)).status,403);
 }finally{process.env=anterior;}
});
