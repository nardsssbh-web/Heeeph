(() => {
 'use strict';
 const $=id=>document.getElementById(id), dinheiro=v=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 let chave='',pedidos=[];
 const recusado=p=>['failed','canceled','cancelled','expired'].includes(p.pagamento?.status);
 const situacao=p=>p.pagamento?.aprovado?'Aprovado':recusado(p)?'Recusado / cancelado':p.pagamento?'Aguardando confirmação':'Não iniciado / em conferência';
 function aviso(t,erro=false){$('mensagem').textContent=t;$('mensagem').dataset.tipo=erro?'erro':'info';}
 function node(tag,texto){const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;return n;}
 async function api(body){const r=await fetch('/api/pedidos',{method:'POST',headers:{Authorization:'Bearer '+chave,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.mensagem||'Não foi possível consultar.');return d;}
 function render(){
  const termo=$('busca').value.trim().toLocaleLowerCase('pt-BR'),filtro=$('filtro').value;
  const lista=pedidos.filter(p=>(filtro==='todos'||filtro==='aprovados'&&p.pagamento?.aprovado||filtro==='recusados'&&recusado(p)||filtro==='pendentes'&&!p.pagamento?.aprovado&&!recusado(p))&&[p.id,p.cliente.nome,p.cliente.email,...p.itens.map(i=>i.nome)].join(' ').toLocaleLowerCase('pt-BR').includes(termo));
  $('pedidos').replaceChildren();$('contagem').textContent=lista.length+' pedido(s) exibido(s) dos '+pedidos.length+' registros carregados (até 50 mais recentes).';
  for(const p of lista){
   const sec=node('section');sec.className='pedido-card';sec.append(node('h2','Pedido '+p.id));const selo=node('p','TESTE — '+situacao(p));selo.className='selo'+(p.pagamento?.aprovado?' aprovado':'');sec.append(selo);
   const a=p.cliente.endereco,dl=node('dl');
   const campos=[['Criado',new Date(p.criadoEm).toLocaleString('pt-BR')],['Cliente',p.cliente.nome],['Contato',p.cliente.email+' — '+p.cliente.telefone],['CPF',p.cliente.cpf],['Entrega',a.street_name+', '+a.street_number+(a.complement?' — '+a.complement:'')+' — '+a.neighborhood+' — '+a.city+'/'+a.state+' — CEP '+a.zip_code],['Frete',p.frete.transportadora+' — '+p.frete.servico+' — '+dinheiro(p.frete.centavos)],['Subtotal',dinheiro(p.subtotal)],['Total',dinheiro(p.total)],['Pagamento',(p.pagamento?.status||'Não iniciado')+' / '+(p.pagamento?.detalhe||'')],['Mercado Pago',p.pagamento?.mpId||'Ainda sem identificador'],['Última consulta',p.pagamento?.atualizadoEm?new Date(p.pagamento.atualizadoEm).toLocaleString('pt-BR'):'Ainda não consultado'],['Envio','Pedido de teste: sem postagem ou etiqueta']];
   for(const [k,v]of campos)dl.append(node('dt',k),node('dd',v));sec.append(dl);
   const table=node('table'),head=node('tr');for(const t of ['Produto / tamanho','Qtd.','Valor'])head.append(node('th',t));table.append(head);
   for(const i of p.itens){const tr=node('tr');for(const t of [i.nome+' — '+i.medida,i.quantidade,dinheiro(i.centavos*i.quantidade)])tr.append(node('td',t));table.append(tr);}sec.append(table);
   p.pacotes.forEach((x,i)=>sec.append(node('p',`Pacote ${i+1}: ${x.grandes} grande(s), ${x.pequenas} pequena(s) — ${x.gramas} g — ${x.length} × ${x.width} × ${x.height} cm${x.estimado?' (peso estimado)':''}`)));
   const button=node('button','Consultar pagamento deste pedido');button.type='button';button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Consultando…';try{const d=await api({acao:'consultar',id:p.id});pedidos=pedidos.map(x=>x.id===p.id?d.pedido:x);render();aviso('Pedido '+p.id+': '+situacao(d.pedido)+'. Consulta atualizada.');}catch(e){aviso(e.message,true);}finally{button.disabled=false;button.textContent='Consultar pagamento deste pedido';}});sec.append(button);$('pedidos').append(sec);
  }
 }
 $('acesso').addEventListener('submit',async e=>{e.preventDefault();chave=$('chave').value; $('carregar').disabled=true;aviso('Carregando pedidos…');try{const d=await api({acao:'listar'});pedidos=d.pedidos;$('filtros').hidden=false;$('sair').hidden=false;render();aviso('Lista atualizada. Use a consulta individual para conferir o pagamento no Mercado Pago.');}catch(e){pedidos=[];$('pedidos').replaceChildren();$('contagem').textContent='';aviso(e.message,true);}finally{$('carregar').disabled=false;}});
 $('busca').addEventListener('input',render);$('filtro').addEventListener('change',render);$('imprimir').addEventListener('click',()=>window.print());
 $('sair').addEventListener('click',()=>{chave='';pedidos=[];$('chave').value='';$('pedidos').replaceChildren();$('contagem').textContent='';$('filtros').hidden=true;$('sair').hidden=true;aviso('Acesso encerrado.');});
})();
