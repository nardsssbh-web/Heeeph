'use strict';
const crypto=require('node:crypto');
const {ambiente}=require('../lib/ambiente');
const {hospedagem}=require('../lib/hospedagem');
const {redis,hash}=require('../lib/checkout');
const {getTodosOsProdutos}=require('../produtos');
const categorias=['bandas','bebidas','games','garage','infantil','motos','musica','rpg','street','trip'];
const chave='heeeph:teste:catalogo:custom:v1';
const chaveOcultos='heeeph:teste:catalogo:ocultos:v1';
const limite=80;
function falha(mensagem,status=400){return Object.assign(new Error(mensagem),{status});}
function habilitado(){return !hospedagem().producao&&ambiente().teste;}
function validar(p,anterior){
 if(!p||typeof p!=='object')throw falha('Confira o cadastro.');
 const nome=String(p.nome||'').trim(),descricao=String(p.descricao||'').trim();
 if(nome.length<3||nome.length>90||/[\x00-\x1f]/.test(nome))throw falha('Informe um nome de 3 a 90 caracteres.');
 if(descricao.length>500||/[\x00-\x1f]/.test(descricao))throw falha('Descrição muito longa.');
 if(!categorias.includes(p.categoria))throw falha('Selecione uma categoria válida.');
 if(!['vertical','horizontal'].includes(p.orientacao))throw falha('Selecione a orientação.');
 if(typeof p.ativo!=='boolean')throw falha('Selecione a disponibilidade.');
 return {id:anterior?.id||'custom-'+crypto.randomUUID(),nome,descricao,categoria:p.categoria,orientacao:p.orientacao,ativo:p.ativo};
}
async function ler(){const raw=await redis(['GET',chave]);if(!raw)return [];const dados=JSON.parse(raw);if(!Array.isArray(dados))throw falha('Catálogo inválido.',503);return dados;}
function publico(p){return {id:p.id,nome:p.nome,descricao:p.descricao,categoria:p.categoria,orientacao:p.orientacao,imagem:'/api/catalogo?imagem='+encodeURIComponent(p.id)};}
async function ocultos(){const raw=await redis(['GET',chaveOcultos]);const ids=raw?JSON.parse(raw):[];return Array.isArray(ids)?ids:[];}
async function catalogo(){if(!habilitado())return [];return (await ler()).filter(p=>p.ativo).map(publico);}
async function disponiveis(){const ids=new Set(await ocultos());return [...getTodosOsProdutos().filter(p=>!ids.has(p.id)),...await catalogo()];}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!habilitado())return res.status(404).json({mensagem:'Recurso indisponível neste ambiente.'});
 try{
  if(req.method==='GET'){
   if(req.query?.imagem){
    const id=String(req.query.imagem);
    if(!/^custom-[0-9a-f-]{36}$/.test(id))return res.status(404).end();
    const p=(await ler()).find(x=>x.id===id&&x.ativo);
    if(!p)return res.status(404).end();
    const raw=await redis(['GET',chave+':imagem:'+id]);
    if(!raw)return res.status(404).end();
    res.setHeader('Content-Type','image/webp');
    res.setHeader('X-Content-Type-Options','nosniff');
    return res.status(200).send(Buffer.from(raw,'base64'));
   }
   return res.json({produtos:await catalogo(),ocultos:await ocultos(),teste:true});
  }
  if(req.method!=='POST')return res.status(405).json({mensagem:'Método não permitido.'});
  const esperado=process.env.HEEEPH_PEDIDOS_ADMIN_TOKEN;
  const recebido=String(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!esperado||esperado.length<32||!crypto.timingSafeEqual(Buffer.from(hash(esperado)),Buffer.from(hash(recebido))))return res.status(401).json({mensagem:'Acesso não autorizado.'});
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const lista=await ler();
  if(b.acao==='listar'){
   const escondidos=await ocultos();
   const originais=[];
   const mapa=require('../produtos');
   for(const categoria of categorias){
    for(const p of (mapa.getProdutosPorCategoria?.(categoria)||[]))originais.push({...p,categoria,oculto:escondidos.includes(p.id)});
   }
   return res.json({produtos:lista,originais,limite,teste:true});
  }
  if(b.acao==='ocultarOriginal'||b.acao==='restaurarOriginal'){
   const id=String(b.id||'');
   if(!getTodosOsProdutos().some(p=>p.id===id))throw falha('Placa original não encontrada.',404);
   const ids=new Set(await ocultos());
   if(b.acao==='ocultarOriginal')ids.add(id);else ids.delete(id);
   await redis(['SET',chaveOcultos,JSON.stringify([...ids]),'EX',30*86400]);
   return res.json({ok:true,oculto:ids.has(id)});
  }
  if(!['salvar','excluir'].includes(b.acao))throw falha('Ação inválida.');
  const id=typeof b.id==='string'?b.id:'';
  const anterior=id?lista.find(x=>x.id===id):null;
  if(id&&!anterior)throw falha('Placa não encontrada.',404);
  if(b.acao==='excluir'){
   if(!anterior||b.confirmacao!==id)throw falha('Confirme a exclusão.');
   const novos=lista.filter(x=>x.id!==id);
   await redis(['SET',chave,JSON.stringify(novos),'EX',30*86400]);
   await redis(['DEL',chave+':imagem:'+id]);
   return res.json({ok:true});
  }
  if(!anterior&&lista.length>=limite)throw falha('Limite de placas de teste atingido.',409);
  const p=validar(b.produto,anterior);
  if(getTodosOsProdutos().some(x=>x.id===p.id))throw falha('ID já existente.',409);
  let imagem=null;
  if(b.imagem!==undefined&&b.imagem!==null&&b.imagem!==''){
   if(typeof b.imagem!=='string'||!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(b.imagem)||b.imagem.length>320000)throw falha('Imagem inválida ou muito grande. Use uma arte menor.');
   imagem=b.imagem.split(',')[1];
  }
  if(!anterior&&!imagem)throw falha('Selecione a imagem da placa.');
  const nova=anterior?lista.map(x=>x.id===id?p:x):[...lista,p];
  if(imagem)await redis(['SET',chave+':imagem:'+p.id,imagem,'EX',30*86400]);
  await redis(['SET',chave,JSON.stringify(nova),'EX',30*86400]);
  return res.json({ok:true,produto:p});
 }catch(e){return res.status(e.status||503).json({mensagem:e.status?e.message:'Não foi possível acessar o catálogo. Confira o banco de teste.'});}
};
module.exports.catalogo=catalogo;
module.exports.disponiveis=disponiveis;
