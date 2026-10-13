document.getElementById('acesso').addEventListener('submit',async e=>{
 e.preventDefault(); const msg=document.getElementById('mensagem'),lista=document.getElementById('pedidos');lista.replaceChildren();msg.textContent='Carregando…';
 const chave=document.getElementById('chave').value;
 try{
  const r=await fetch('/api/pedidos',{method:'POST',headers:{Authorization:'Bearer '+chave}});const d=await r.json();if(!r.ok)throw new Error(d.mensagem);
  for(const p of d.pedidos){const sec=document.createElement('section');sec.className='item';const h=document.createElement('h2');h.textContent='TESTE — '+p.id;sec.append(h);
   const dados=[`Criado: ${new Date(p.criadoEm).toLocaleString('pt-BR')}`,`Pagamento: ${p.pagamento?.status||'não iniciado'} / ${p.pagamento?.detalhe||''}`,`Total: ${(p.total/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`,`Cliente: ${p.cliente.nome} — ${p.cliente.email} — ${p.cliente.telefone}`,`Endereço: ${p.cliente.endereco.street_name}, ${p.cliente.endereco.street_number} ${p.cliente.endereco.complement} — ${p.cliente.endereco.neighborhood} — ${p.cliente.endereco.city}/${p.cliente.endereco.state} — CEP ${p.cliente.endereco.zip_code}`,`Frete: ${p.frete.transportadora} — ${p.frete.servico}`, ...p.itens.map(i=>`${i.quantidade} × ${i.nome} — ${i.medida}`)];
   for(const texto of dados){const linha=document.createElement('p');linha.textContent=texto;sec.append(linha);}lista.append(sec);
  }msg.textContent=d.pedidos.length?'Últimos pedidos registrados.':'Nenhum pedido registrado.';
 }catch(err){msg.textContent=err.message||'Não foi possível carregar.';}
});
