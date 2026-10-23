(()=>{
 const estado=document.getElementById('estadoRecuperacao');
 (async()=>{
  try{
   const url=new URL(window.location.href),acesso=/^#acesso=([a-f0-9]{64})$/.exec(url.hash)?.[1];
   if(!window.history?.replaceState)throw Error('Este navegador não permite proteger o link. Abra no navegador padrão.');
   window.history.replaceState(null,'',url.pathname+url.search);
   if(!acesso)throw Error('Link inválido ou já utilizado. Solicite outro acesso no painel.');
   const referencias=[JSON.parse(localStorage.getItem('heeeph_pedido_recuperavel')||'null'),JSON.parse(sessionStorage.getItem('heeeph_pedido_teste')||'null')];
   if(referencias.some(r=>r?.id&&r.id!=='83891a67a9028883fed00b55b64db215')||sessionStorage.getItem('heeeph_preparacao'))throw Error('Há outro pedido ou preparação neste navegador. Não vamos substituir seu acesso.');
   const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({acao:'resgatarCheckoutTeste',acessoTemporario:acesso})});
   const p=await r.json();
   if(!r.ok)throw Error(p.mensagem||'Não foi possível recuperar o pedido de teste.');
   if(p.id!=='83891a67a9028883fed00b55b64db215'||p.teste!==true||p.recuperacaoTeste!==true||!Number.isFinite(p.expiraEm)||p.expiraEm<=Date.now()||!/^[a-f0-9]{64}$/.test(p.token||''))throw Error('A recuperação não retornou uma referência segura.');
   const recibo=JSON.stringify({id:p.id,token:p.token,expiraEm:p.expiraEm,recuperacaoTeste:true});
   sessionStorage.setItem('heeeph_recuperacao_teste',recibo);
   if(sessionStorage.getItem('heeeph_recuperacao_teste')!==recibo)throw Error('Não foi possível manter o acesso temporário. Solicite outro link.');
   window.location.replace('pagamento.html');
  }catch(e){estado.textContent=e.message+' Nenhum pedido ou pagamento foi criado.';estado.setAttribute('role','alert');}
 })();
})();
