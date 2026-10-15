(() => {
 'use strict';
 const $=id=>document.getElementById(id), dinheiro=v=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 let chave='',pedidos=[];
 const retornos=new Map();
 const etapas=['Recebido','Em Preparação','Saiu para entrega','Entregue'];
 const recusado=p=>['failed','canceled','cancelled','expired'].includes(p.pagamento?.status);
 const situacao=p=>p.pagamento?.aprovado?'Aprovado':recusado(p)?'Recusado / cancelado':p.pagamento?'Aguardando confirmação':'Não iniciado / em conferência';
 function aviso(t,erro=false){$('mensagem').textContent=t;$('mensagem').dataset.tipo=erro?'erro':'info';}
 function node(tag,texto){const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;return n;}
 async function api(body){const r=await fetch('/api/pedidos',{method:'POST',headers:{Authorization:'Bearer '+chave,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.mensagem||'Não foi possível consultar.');return d;}
 function render(focoId){
  const termo=$('busca').value.trim().toLocaleLowerCase('pt-BR'),filtro=$('filtro').value;
  const lista=pedidos.filter(p=>(filtro==='todos'||filtro==='aprovados'&&p.pagamento?.aprovado||filtro==='recusados'&&recusado(p)||filtro==='pendentes'&&!p.pagamento?.aprovado&&!recusado(p))&&[p.id,p.cliente.nome,p.cliente.email,...p.itens.map(i=>i.nome)].join(' ').toLocaleLowerCase('pt-BR').includes(termo));
  $('pedidos').replaceChildren();$('contagem').textContent=lista.length+' pedido(s) exibido(s) dos '+pedidos.length+' registros carregados (até 50 mais recentes).';
  for(const p of lista){
   const sec=node('section');sec.className='pedido-card';sec.id='pedido-'+p.id;sec.append(node('h2','Pedido '+p.id));const etapaTopo=node('p',p.gestao?.status||'Recebido');etapaTopo.className='etapa-topo';etapaTopo.dataset.etapa=String(etapas.indexOf(p.gestao?.status||'Recebido'));sec.append(etapaTopo);const selo=node('p','Pagamento de teste — '+situacao(p));selo.className='selo'+(p.pagamento?.aprovado?' aprovado':'');sec.append(selo);
   const a=p.cliente.endereco,dl=node('dl');
   const campos=[['Criado',new Date(p.criadoEm).toLocaleString('pt-BR')],['Cliente',p.cliente.nome],['Contato',p.cliente.email+' — '+p.cliente.telefone],['CPF',p.cliente.cpf],['Entrega',a.street_name+', '+a.street_number+(a.complement?' — '+a.complement:'')+' — '+a.neighborhood+' — '+a.city+'/'+a.state+' — CEP '+a.zip_code],['Frete',p.frete.transportadora+' — '+p.frete.servico+' — '+dinheiro(p.frete.centavos)],['Subtotal',dinheiro(p.subtotal)],['Total',dinheiro(p.total)],['Pagamento',(p.pagamento?.status||'Não iniciado')+' / '+(p.pagamento?.detalhe||'')],['Mercado Pago',p.pagamento?.mpId||'Ainda sem identificador'],['Última consulta',p.pagamento?.atualizadoEm?new Date(p.pagamento.atualizadoEm).toLocaleString('pt-BR'):'Ainda não consultado'],['Envio','Pedido de teste: sem postagem ou etiqueta']];
   campos.push(['Status do pedido',p.gestao?.status||'Recebido']);
   for(const [k,v]of campos)dl.append(node('dt',k),node('dd',v));sec.append(dl);
   const produtos=node('div');produtos.className='produtos-destaque';produtos.append(node('h3','Produtos deste pedido'));const table=node('table'),head=node('tr');for(const t of ['Produto / tamanho','Qtd.','Valor'])head.append(node('th',t));table.append(head);
   for(const i of p.itens){const tr=node('tr');for(const t of [i.nome+' — '+i.medida,i.quantidade,dinheiro(i.centavos*i.quantidade)])tr.append(node('td',t));table.append(tr);}produtos.append(table);sec.insertBefore(produtos,dl);
   p.pacotes.forEach((x,i)=>sec.append(node('p',`Pacote ${i+1}: ${x.grandes} grande(s), ${x.pequenas} pequena(s) — ${x.gramas} g — ${x.length} × ${x.width} × ${x.height} cm${x.estimado?' (peso estimado)':''}`)));
   const retorno=node('p');retorno.className='retorno-pedido';retorno.setAttribute('role','status');retorno.setAttribute('aria-live','polite');const anterior=retornos.get(p.id);if(anterior){retorno.textContent=anterior.texto;retorno.dataset.tipo=anterior.cor||(anterior.erro?'erro':'info');}sec.append(retorno);
   function responder(texto,erro=false,cor){const tipo=cor||(erro?'erro':'info');retornos.set(p.id,{texto,erro,cor:tipo});retorno.textContent=texto;retorno.dataset.tipo=tipo;}
   const button=node('button','Consultar Pagamento');button.type='button';button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Consultando…';responder('Consultando a situação do pagamento…');try{const d=await api({acao:'consultar',id:p.id});pedidos=pedidos.map(x=>x.id===p.id?d.pedido:x);responder('Consulta realizada às '+new Date().toLocaleTimeString('pt-BR')+'. Pagamento: '+situacao(d.pedido)+'.'+(!d.pedido.pagamento?' Nenhum pagamento confirmado para este pedido.':''),false,d.pedido.pagamento?.aprovado?'aprovado':recusado(d.pedido)?'recusado':d.pedido.pagamento?'pendente':'info');render(p.id);}catch(e){responder(e.message,true);}finally{button.disabled=false;button.textContent='Consultar Pagamento';}});sec.append(button);
   const label=node('label','Status do pedido'),select=node('select');select.setAttribute('aria-label','Status do pedido '+p.id);
   for(const etapa of etapas){const o=node('option',etapa);o.value=etapa;select.append(o);}select.value=p.gestao?.status||'Recebido';label.append(select);sec.append(label);
   const salvar=node('button','Salvar status');salvar.type='button';salvar.addEventListener('click',async()=>{salvar.disabled=true;select.disabled=true;try{const d=await api({acao:'etapa',id:p.id,status:select.value});pedidos=pedidos.map(x=>x.id===p.id?d.pedido:x);responder('Status salvo: '+d.pedido.gestao.status+'.');render(p.id);}catch(e){responder(e.message,true);}finally{salvar.disabled=false;select.disabled=false;}});sec.append(salvar);
   const excluir=node('button','Excluir');excluir.type='button';excluir.className='excluir';excluir.addEventListener('click',async()=>{if(!window.confirm('Excluir o pedido '+p.id+' do painel? Esta ação não cancela nem estorna pagamentos no Mercado Pago.'))return;excluir.disabled=true;try{await api({acao:'excluir',id:p.id,confirmacao:p.id});pedidos=pedidos.filter(x=>x.id!==p.id);render();aviso('Pedido excluído do painel. O pagamento não foi alterado.');}catch(e){aviso(e.message,true);}finally{excluir.disabled=false;}});sec.append(excluir);$('pedidos').append(sec);
  }
  if(focoId){const card=$('pedido-'+focoId);if(card)card.scrollIntoView({block:'start',behavior:'smooth'});}
 }
 $('acesso').addEventListener('submit',async e=>{e.preventDefault();chave=$('chave').value; $('carregar').disabled=true;aviso('Carregando pedidos…');try{const d=await api({acao:'listar'});pedidos=d.pedidos;$('filtros').hidden=false;$('sair').hidden=false;render();aviso('Lista atualizada. Use a consulta individual para conferir o pagamento no Mercado Pago.');}catch(e){pedidos=[];$('pedidos').replaceChildren();$('contagem').textContent='';aviso(e.message,true);}finally{$('carregar').disabled=false;}});
 $('busca').addEventListener('input',render);$('filtro').addEventListener('change',render);$('imprimir').addEventListener('click',()=>window.print());
 $('sair').addEventListener('click',()=>{chave='';pedidos=[];$('chave').value='';$('pedidos').replaceChildren();$('contagem').textContent='';$('filtros').hidden=true;$('sair').hidden=true;aviso('Acesso encerrado.');});
})();
