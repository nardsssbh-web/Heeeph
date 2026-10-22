const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),net=require('node:net');
const {spawn,execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile),c=require('../lib/checkout');
const bin=path.resolve(__dirname,'../../ferramentas-recuperacao/redis-8.10.2/Redis-8.10.2-Windows-x64-msys2');

test('Lua no Redis local: pedido/índice, TTL, falha de tipo e resposta perdida sem duplicação',async t=>{
 try{await fs.access(path.join(bin,'redis-server.exe'));}catch{t.skip('Redis portátil local não disponível; não baixar nem usar banco remoto.');return;}
 const env={...process.env},originalFetch=global.fetch;
 const folder=await fs.mkdtemp(path.resolve(__dirname,'../../ferramentas-recuperacao/redis-ensaio-'));
 const password=require('node:crypto').randomBytes(32).toString('hex');
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const config=path.join(folder,'teste.conf');
 await fs.writeFile(config,`bind 127.0.0.1\nport ${port}\nprotected-mode yes\nrequirepass ${password}\nsave ""\nappendonly no\ndir "."\nlogfile "teste.log"\n`);
 const child=spawn(path.join(bin,'redis-server.exe'),[path.basename(config)],{cwd:folder,windowsHide:true,stdio:'ignore'});
 child.on('error',()=>{});
 async function cmd(...args){const {stdout}=await run(path.join(bin,'redis-cli.exe'),['-h','127.0.0.1','-p',String(port),'--json',...args.map(String)],{env:{...process.env,REDISCLI_AUTH:password},windowsHide:true,timeout:1000});return JSON.parse(stdout.trim());}
 try{
  let ready=false;const ate=Date.now()+15000;while(Date.now()<ate){try{if(await cmd('PING')==='PONG'){ready=true;break;}}catch{}if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(ready,true,'Redis deve iniciar apenas no loopback');
  Object.assign(process.env,{CHECKOUT_AMBIENTE:'teste',UPSTASH_REDIS_REST_URL:'https://redis-local.test',UPSTASH_REDIS_REST_TOKEN:'ficticio'});
  delete process.env.VERCEL_ENV;delete process.env.HEEEPH_HOSPEDAGEM;
  let perderResposta=false;
  global.fetch=async(url,opts)=>{
   assert.ok(['https://redis-local.test','https://redis-producao-local.test'].includes(url),'Proibido acessar qualquer serviço externo');
   try{const result=await cmd(...JSON.parse(opts.body));if(perderResposta){perderResposta=false;throw Error('resposta perdida depois de executar');}return{ok:true,json:async()=>({result})};}
   catch(e){if(e.message==='resposta perdida depois de executar')throw e;return{ok:true,json:async()=>({error:'Falha local simulada'})};}
  };
  const p={id:'a'.repeat(32),ambiente:'teste',criadoEm:'2026-10-22T12:00:00Z',total:100};
  await c.salvar(p);assert.deepEqual(JSON.parse(await cmd('GET',c.prefixo+p.id)),p);
  assert.equal(await cmd('ZCARD',c.prefixo+'lista'),1);assert.ok(await cmd('TTL',c.prefixo+p.id)>2591900);
  perderResposta=true;await assert.rejects(()=>c.salvar(p));await c.salvar(p);
  assert.equal(await cmd('ZCARD',c.prefixo+'lista'),1);assert.deepEqual(JSON.parse(await cmd('GET',c.prefixo+p.id)),p);
  await cmd('DEL',c.prefixo+'lista');await cmd('SET',c.prefixo+'lista','tipo-invalido-local');
  await assert.rejects(()=>c.salvar({...p,total:999}),{status:503});
  assert.equal(JSON.parse(await cmd('GET',c.prefixo+p.id)).total,100);
  Object.assign(process.env,{CHECKOUT_AMBIENTE:'producao',VERCEL_ENV:'production',UPSTASH_REDIS_REST_URL_PROD:'https://redis-producao-local.test',UPSTASH_REDIS_REST_TOKEN_PROD:'ficticio-prod'});
  const prod={...p,id:'b'.repeat(32),ambiente:'producao'};await c.salvar(prod);
  assert.equal(await cmd('TTL',c.prefixo+prod.id),-1);assert.equal(await cmd('ZCARD',c.prefixo+'lista'),1);
 }finally{
  try{await cmd('SHUTDOWN','NOSAVE');}catch{}
  if(child.exitCode===null)await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,2000))]);
  if(child.exitCode===null)child.kill();
  process.env=env;global.fetch=originalFetch;
  await fs.unlink(config);await fs.unlink(path.join(folder,'teste.log')).catch(()=>{});await fs.rmdir(folder);
 }
});
