'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const MAGIC=Buffer.from('HEEEPH-BACKUP-01\n');
const HEADER=MAGIC.length+16+12;
const MAX=64*1024*1024;
function senhaValida(senha){
 if(typeof senha!=='string'||senha.length<16||Buffer.byteLength(senha)>1024)throw Error('Use uma senha exclusiva de 16 a 1024 caracteres/bytes.');
}
function rdbValido(dados){
 if(!Buffer.isBuffer(dados)||dados.length<10||dados.length>MAX||!/^REDIS\d{4}$/.test(dados.subarray(0,9).toString('ascii')))throw Error('Arquivo RDB inválido ou maior que 64 MiB.');
}
async function chave(senha,sal){
 senhaValida(senha);
 return scrypt(senha,sal,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
}
async function proteger(dados,senha){
 rdbValido(dados);
 const sal=crypto.randomBytes(16),iv=crypto.randomBytes(12),cabecalho=Buffer.concat([MAGIC,sal,iv]);
 const segredo=await chave(senha,sal);
 try{
  const cifra=crypto.createCipheriv('aes-256-gcm',segredo,iv);cifra.setAAD(cabecalho);
  const cifrado=Buffer.concat([cifra.update(dados),cifra.final()]);
  return Buffer.concat([cabecalho,cifra.getAuthTag(),cifrado]);
 }finally{segredo.fill(0);}
}
async function abrir(arquivo,senha){
 if(!Buffer.isBuffer(arquivo)||arquivo.length<HEADER+16+10||arquivo.length>MAX+HEADER+16||!arquivo.subarray(0,MAGIC.length).equals(MAGIC))throw Error('Formato de backup protegido inválido.');
 const sal=arquivo.subarray(MAGIC.length,MAGIC.length+16),iv=arquivo.subarray(MAGIC.length+16,HEADER);
 const segredo=await chave(senha,sal);
 try{
  const cifra=crypto.createDecipheriv('aes-256-gcm',segredo,iv);cifra.setAAD(arquivo.subarray(0,HEADER));cifra.setAuthTag(arquivo.subarray(HEADER,HEADER+16));
  let dados;
  try{dados=Buffer.concat([cifra.update(arquivo.subarray(HEADER+16)),cifra.final()]);}catch{throw Error('Senha incorreta ou backup alterado/incompleto.');}
  rdbValido(dados);return dados;
 }finally{segredo.fill(0);}
}
function resumo(dados){return {bytes:dados.length,sha256:crypto.createHash('sha256').update(dados).digest('hex')};}
async function lerLimitado(caminho,maximo){
 const f=await fs.promises.open(caminho,'r');
 try{const info=await f.stat();if(!info.isFile()||info.size>maximo)throw Error('Arquivo inválido ou acima do limite.');const dados=await f.readFile();if(dados.length>maximo)throw Error('Arquivo acima do limite.');return dados;}finally{await f.close();}
}
async function executar(args,senha){
 const [acao,entrada,saida]=args;
 if(!entrada||!['proteger','verificar'].includes(acao)||(acao==='proteger'?!saida:!!saida)||args.length>(acao==='proteger'?3:2))throw Error('Uso: proteger entrada.rdb saida.heeephbak | verificar arquivo.heeephbak');
 senhaValida(senha);
 if(acao==='proteger'){
  const dados=await lerLimitado(entrada,MAX);
  try{
   const arquivo=await proteger(dados,senha),conferencia=await abrir(arquivo,senha);
   try{if(!conferencia.equals(dados))throw Error('Falha na conferência da cópia.');}finally{conferencia.fill(0);}
   await fs.promises.writeFile(saida,arquivo,{flag:'wx',mode:0o600});
   return {acao,...resumo(dados)};
  }finally{dados.fill(0);}
 }
 const arquivo=await lerLimitado(entrada,MAX+HEADER+16),dados=await abrir(arquivo,senha);
 try{return {acao,...resumo(dados)};}finally{dados.fill(0);}
}
module.exports={proteger,abrir,resumo,executar};
if(require.main===module){
 const senha=process.env.HEEEPH_BACKUP_SENHA;delete process.env.HEEEPH_BACKUP_SENHA;
 executar(process.argv.slice(2),senha).then(r=>process.stdout.write(JSON.stringify(r)+'\n')).catch(e=>{process.stderr.write(e.code==='EEXIST'?'Destino já existe; nada foi sobrescrito.\n':e.message+'\n');process.exitCode=1;});
}
