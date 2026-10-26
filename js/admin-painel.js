(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const tabs=[...document.querySelectorAll('.admin-abas [role="tab"]')];
 const dinheiro=centavos=>(Number(centavos||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 let dados=[],pagina=1,mais=false,autenticado=false;
 function elemento(tag,valor){const n=document.createElement(tag);if(valor!==undefined)n.textContent=String(valor);return n;}
 function campo(pai,rotulo,valor){const p=elemento('p');const b=elemento('strong',rotulo+': ');p.append(b,document.createTextNode(String(valor??'Não informado')));pai.append(p);}
 function vazio(area,mensagem){area.replaceChildren(elemento('p',mensagem));}
 function selecionar(aba){
  if(!autenticado)return;
  for(const item of tabs){
   const ativo=item===aba;
   item.setAttribute('aria-selected',String(ativo));item.tabIndex=ativo?0:-1;
   $(item.getAttribute('aria-controls')).hidden=!ativo;
  }
 }
 for(const aba of tabs){
  aba.addEventListener('click',()=>selecionar(aba));
  aba.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   e.preventDefault();
   const i=tabs.indexOf(aba),j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   selecionar(tabs[j]);tabs[j].focus();
  });
 }
 function avisoPagina(area){campo(area,'Origem','Pedidos carregados na página '+pagina+(mais?' (existem outras páginas)':''));}
 function envios(){
  const area=$('resumo-envios');area.replaceChildren();avisoPagina(area);
  if(!dados.length){area.append(elemento('p','Nenhum pedido nesta página.'));return;}
  for(const p of dados){
   const card=elemento('article');card.className='admin-card';
   card.append(elemento('h3','Pedido '+p.id));
   campo(card,'Cliente',p.cliente?.nome);
   const a=p.cliente?.endereco||{};
   campo(card,'Entrega',[a.street_name,a.street_number,a.neighborhood,a.city,a.state,a.zip_code].filter(Boolean).join(', '));
   campo(card,'Frete',[p.frete?.transportadora,p.frete?.servico].filter(Boolean).join(' — '));
   campo(card,'Produtos',(p.itens||[]).map(i=>i.quantidade+' × '+i.nome+' ('+i.medida+')').join('; '));
   campo(card,'Pagamento',p.pagamento?.aprovado?'Aprovado':'Não confirmado');
   campo(card,'Etapa',p.gestao?.status||'Recebido');
   card.append(elemento('small','Consulta somente leitura. Etiquetas e rastreamento ainda não integrados.'));
   area.append(card);
  }
 }
 function produtos(){
  const area=$('resumo-produtos');area.replaceChildren();avisoPagina(area);
  const mapa=new Map();
  for(const p of dados)for(const i of p.itens||[]){
   const chave=String(i.nome||'Produto')+' — '+String(i.medida||'');
   const anterior=mapa.get(chave)||{nome:chave,qtd:0,pedidos:0};
   anterior.qtd+=Number(i.quantidade||0);anterior.pedidos++;mapa.set(chave,anterior);
  }
  if(!mapa.size){area.append(elemento('p','Nenhum produto nos pedidos carregados.'));return;}
  const tabela=elemento('table'),cab=elemento('tr');
  for(const titulo of ['Produto / tamanho','Unidades','Ocorrências em pedidos'])cab.append(elemento('th',titulo));
  tabela.append(cab);
  for(const item of [...mapa.values()].sort((a,b)=>b.qtd-a.qtd)){
   const tr=elemento('tr');for(const valor of [item.nome,item.qtd,item.pedidos])tr.append(elemento('td',valor));tabela.append(tr);
  }
  area.append(tabela,elemento('small','Resumo apenas dos pedidos carregados, não é controle de estoque nem catálogo completo.'));
 }
 function financeiro(){
  const area=$('resumo-financeiro');area.replaceChildren();avisoPagina(area);
  const aprovados=dados.filter(p=>p.pagamento?.aprovado);
  const pendentes=dados.filter(p=>!p.pagamento?.aprovado);
  const total=aprovados.reduce((s,p)=>s+Number(p.total||0),0);
  const cards=elemento('div');cards.className='admin-indicadores';
  for(const [rotulo,valor] of [['Pedidos na página',dados.length],['Pagamentos aprovados',aprovados.length],['Não aprovados / pendentes',pendentes.length],['Valor dos pedidos aprovados',dinheiro(total)]]){
   const card=elemento('div');card.className='admin-card';card.append(elemento('strong',rotulo),elemento('p',valor));cards.append(card);
  }
  area.append(cards,elemento('p','Valores dos pedidos exibidos nesta página. Não representam faturamento total, saldo disponível, taxas ou repasses do Mercado Pago.'));
 }
 function atualizar(){if(!autenticado)return;envios();produtos();financeiro();}
 document.addEventListener('heeeph:pedidos',e=>{dados=Array.isArray(e.detail?.pedidos)?e.detail.pedidos:[];pagina=e.detail?.pagina||1;mais=!!e.detail?.mais;atualizar();});
 document.addEventListener('heeeph:autenticado',()=>{
  autenticado=true;
  $('admin-topo').hidden=false;$('admin-abas').hidden=false;
  $('acesso').hidden=true;
  $('admin-sair').append($('sair'));$('sair').hidden=false;
  selecionar($('aba-pedidos'));atualizar();
 });
 document.addEventListener('heeeph:sair',()=>{
  autenticado=false;dados=[];pagina=1;mais=false;
  $('admin-topo').hidden=true;$('admin-abas').hidden=true;
  $('acesso').hidden=false;$('acesso').append($('sair'));
  for(const tab of tabs)$(tab.getAttribute('aria-controls')).hidden=tab.id!=='aba-pedidos';
  for(const id of ['resumo-envios','resumo-produtos','resumo-financeiro'])$(id).replaceChildren();
  $('chave').type='password';
 });
})();
