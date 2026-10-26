(() => {
 'use strict';
 const badge=document.getElementById('pedidos-alerta');
 const tab=document.getElementById('aba-pedidos');
 if(!badge||!tab)return;
 let ativo=false,intervalo=null,sequencia=0,emConsulta=false,pendente=false;
 function limpar(){badge.hidden=true;badge.textContent='';tab.removeAttribute('aria-label');}
 async function atualizar(){
  if(!ativo)return;
  if(emConsulta){pendente=true;return;}
  const senha=document.getElementById('chave').value;
  if(!senha)return;
  const atual=sequencia;
  emConsulta=true;
  try{
   const resposta=await fetch('/api/pedidos',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+senha},body:JSON.stringify({acao:'contarPendentes'}),cache:'no-store'});
   if(!resposta.ok)throw Error('Falha ao consultar contador.');
   const dados=await resposta.json();
   if(!ativo||atual!==sequencia)return;
   if(!dados.completo){limpar();tab.setAttribute('aria-label','Pedidos — contador indisponível para catálogo grande');return;}
   const n=Number(dados.pendentes)||0;
   badge.hidden=n===0;
   badge.textContent=n>0?String(n):'';
   tab.setAttribute('aria-label',n?('Pedidos — '+n+' aguardando encaminhamento'):'Pedidos — nenhum aguardando encaminhamento');
  }catch(e){
   if(ativo&&atual===sequencia){limpar();tab.setAttribute('aria-label','Pedidos — não foi possível consultar pendências');}
  }finally{emConsulta=false;if(pendente&&ativo){pendente=false;atualizar();}}
 }
 document.addEventListener('heeeph:autenticado',()=>{
  ativo=true;
  if(intervalo)clearInterval(intervalo);
  atualizar();
  intervalo=setInterval(()=>{if(!document.hidden)atualizar();},60000);
 });
 document.addEventListener('heeeph:pedidos',()=>{if(ativo)atualizar();});
 document.addEventListener('heeeph:sair',()=>{
  ativo=false;sequencia++;pendente=false;
  if(intervalo){clearInterval(intervalo);intervalo=null;}
  limpar();
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ativo)atualizar();});
})();
