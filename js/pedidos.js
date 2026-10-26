(() => {
 'use strict';
 const $=id=>document.getElementById(id), dinheiro=v=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 let chave='',pedidos=[];
 let cursores=[null],paginaAtual=0,proximo=null,sequencia=0;
 const retornos=new Map();
 const etapas=['Recebido','Em Preparação','Saiu para entrega','Entregue'];
 const recusado=p=>['failed','canceled','cancelled','expired','rejected','error'].includes(p.pagamento?.status);
 const situacao=p=>p.pagamento?.aprovado?'Aprovado':recusado(p)?'Recusado / cancelado':p.pagamento?'Aguardando confirmação':'Não iniciado / em conferência';
 function aviso(t,erro=false){$('mensagem').textContent=t;$('mensagem').dataset.tipo=erro?'erro':'info';}
 function node(tag,texto){const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;return n;}
 async function api(body){const r=await fetch('/api/pedidos',{method:'POST',headers:{Authorization:'Bearer '+chave,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.mensagem||'Não foi possível consultar.');return d;}
 function render(focoId){
  const lista=pedidos;
  $('pedidos').replaceChildren();$('contagem').textContent=lista.length+' pedido(s) nesta página. Página '+(paginaAtual+1)+'.'+(proximo?' Há mais registros para consultar.':' Fim dos resultados.');
  $('paginacao').hidden=$('paginacaoRodape').hidden=false;
  for(const id of ['anterior','anteriorRodape'])$(id).disabled=paginaAtual===0;
  for(const id of ['proxima','proximaRodape'])$(id).disabled=!proximo;
  $('paginaRodape').textContent='Página '+(paginaAtual+1)+(proximo?' — há mais registros.':' — fim dos resultados.');
  for(const p of lista){
   const sec=node('section');sec.className='pedido-card';sec.id='pedido-'+p.id;sec.append(node('h2','Pedido '+p.id));const etapaTopo=node('p',p.gestao?.status||'Recebido');etapaTopo.className='etapa-topo';etapaTopo.dataset.etapa=String(etapas.indexOf(p.gestao?.status||'Recebido'));sec.append(etapaTopo);const selo=node('p',(p.ambiente==='producao'?'Pagamento — ':'Pagamento de teste — ')+situacao(p));selo.className='selo'+(p.pagamento?.aprovado?' aprovado':'');sec.append(selo);
   const a=p.cliente.endereco,dl=node('dl');
   const campos=[['Criado',new Date(p.criadoEm).toLocaleString('pt-BR')],['Cliente',p.cliente.nome],['Contato',p.cliente.email+' — '+p.cliente.telefone],['CPF',p.cliente.cpf],['Entrega',a.street_name+', '+a.street_number+(a.complement?' — '+a.complement:'')+' — '+a.neighborhood+' — '+a.city+'/'+a.state+' — CEP '+a.zip_code],['Frete',p.frete.transportadora+' — '+p.frete.servico+' — '+dinheiro(p.frete.centavos)],['Subtotal',dinheiro(p.subtotal)],['Total',dinheiro(p.total)],['Pagamento',(p.pagamento?.status||'Não iniciado')+' / '+(p.pagamento?.detalhe||'')],['Mercado Pago',p.pagamento?.mpId||'Ainda sem identificador'],['Última consulta',p.pagamento?.atualizadoEm?new Date(p.pagamento.atualizadoEm).toLocaleString('pt-BR'):'Ainda não consultado'],['Envio',p.ambiente==='producao'?'Etapas manuais; etiqueta e rastreio não integrados':'Pedido de teste: sem postagem ou etiqueta']];
   for(const [i,t] of (p.pagamento?.transacoes||[]).entries())campos.push(['Transação '+(i+1),[t.metodo,t.status,t.detalhe].filter(Boolean).join(' / ')||'Sem detalhe retornado']);
   if(p.pagamento?.valoresMP){
     const v=p.pagamento.valoresMP,valor=x=>Number.isFinite(x)?dinheiro(x):'Não informado pelo Mercado Pago';
     campos.push(['Total pago informado pelo Mercado Pago',valor(v.totalPago)],['Valor pago da transação',valor(v.transacaoPaga)],['Valor nominal da transação',valor(v.transacaoValor)],
       ['Elegibilidade local para cancelar Pix',p.pagamento.cancelavel===true?'Comprovada na última consulta':'Não comprovada; cancelamento não solicitado por esta validação']);
   }
   if(p.pagamento?.aplicacao)campos.push(['Aplicação Mercado Pago',p.pagamento.aplicacao]);
   if(p.pagamento?.erros?.length)campos.push(['Erros da consulta Mercado Pago',p.pagamento.erros.join(', ')]);
   campos.push(['Webhook autenticado',p.webhookRecebido?.assinaturaValidada?new Date(p.webhookRecebido.em).toLocaleString('pt-BR')+' — '+p.webhookRecebido.status:'Sem comprovação registrada; consulta de pagamento não comprova webhook']);
   if(p.respostaMP)campos.push(['Resposta HTTP da tentativa',String(p.respostaMP.http)],['Códigos da resposta',(p.respostaMP.codigos||[]).join(', ')||'Nenhum código adicional'],['Requisição Mercado Pago',p.respostaMP.requestId||'Não retornada']);
   if(p.payloadPix){campos.push(['Conferência do payload Pix',p.payloadPix.conferido?'Corresponde à impressão digital da tentativa enviada':'Não foi possível comprovar o payload enviado']);if(p.payloadPix.conferido)campos.push(['payer.first_name = APRO',p.payloadPix.primeiroNomeAPRO?'Sim':'Não'],['payer.email = test@testuser.com',p.payloadPix.emailTeste?'Sim':'Não']);}
   if(p.pagamento?.pix)campos.push(['Pix copia e cola',p.pagamento.pix.codigo?'Retornado pelo Mercado Pago':'Não retornado'],['Imagem QR do Mercado Pago',p.pagamento.pix.imagem?'Retornada':'Não retornada (o checkout pode gerar o QR a partir do copia e cola)']);
   if(p.pagamento&&!p.pagamento.transacoes)campos.push(['Diagnóstico','Clique em Consultar Pagamento para atualizar os detalhes da tentativa existente.']);
   campos.push(['Status do pedido',p.gestao?.status||'Recebido']);
   for(const [k,v]of campos)dl.append(node('dt',k),node('dd',v));sec.append(dl);
   const produtos=node('div');produtos.className='produtos-destaque';produtos.append(node('h3','Produtos deste pedido'));const table=node('table'),head=node('tr');for(const t of ['Produto / tamanho','Qtd.','Valor'])head.append(node('th',t));table.append(head);
   for(const i of p.itens){const tr=node('tr');for(const t of [i.nome+' — '+i.medida,i.quantidade,dinheiro(i.centavos*i.quantidade)])tr.append(node('td',t));table.append(tr);}produtos.append(table);sec.insertBefore(produtos,dl);
   p.pacotes.forEach((x,i)=>sec.append(node('p',`Pacote ${i+1}: ${x.grandes} grande(s), ${x.pequenas} pequena(s) — ${x.gramas} g — ${x.length} × ${x.width} × ${x.height} cm${x.estimado?' (peso estimado)':''}`)));
   const retorno=node('p');retorno.className='retorno-pedido';retorno.setAttribute('role','status');retorno.setAttribute('aria-live','polite');const anterior=retornos.get(p.id);if(anterior){retorno.textContent=anterior.texto;retorno.dataset.tipo=anterior.cor||(anterior.erro?'erro':'info');}sec.append(retorno);
   function responder(texto,erro=false,cor){const tipo=cor||(erro?'erro':'info');retornos.set(p.id,{texto,erro,cor:tipo});retorno.textContent=texto;retorno.dataset.tipo=tipo;}
   const button=node('button','Consultar Pagamento');button.type='button';button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Consultando…';responder('Consultando a situação do pagamento…');try{const d=await api({acao:'consultar',id:p.id});pedidos=pedidos.map(x=>x.id===p.id?d.pedido:x);responder('Consulta realizada às '+new Date().toLocaleTimeString('pt-BR')+'. Pagamento: '+situacao(d.pedido)+'.'+(!d.pedido.pagamento?' Nenhum pagamento confirmado para este pedido.':''),false,d.pedido.pagamento?.aprovado?'aprovado':recusado(d.pedido)?'recusado':d.pedido.pagamento?'pendente':'info');render(p.id);}catch(e){responder(e.message,true);}finally{button.disabled=false;button.textContent='Consultar Pagamento';}});sec.append(button);
   if(p.id==='83891a67a9028883fed00b55b64db215'&&p.ambiente==='teste'){
     const emitir=node('button','Recuperar checkout expirado de teste');emitir.type='button';
     const area=node('div');area.hidden=true;let versaoQR=0;
     emitir.addEventListener('click',async()=>{
       if(!window.confirm('Criar acesso temporário de uso único, por até 5 minutos, somente para consultar e desistir deste pedido expirado? Não permite pagar. Não compartilhe o acesso.'))return;
       const versao=++versaoQR;emitir.disabled=true;area.replaceChildren();area.hidden=true;
       try{
         const r=await api({acao:'recuperarCheckoutTeste',id:p.id,confirmacao:p.id});
         if(!/^[a-f0-9]{64}$/.test(r.acessoTemporario||'')||!Number.isFinite(r.expiraEm))throw Error('Acesso temporário não confirmado.');
         const url=new URL('retomar-teste.html',window.location.href);url.hash='acesso='+r.acessoTemporario;
         const aviso=node('p','Acesso válido até '+new Date(r.expiraEm).toLocaleTimeString('pt-BR')+'. Aponte a câmera do celular para este QR. Ele é uma chave temporária: não compartilhe nem fotografe para enviar ao chat. O prazo é do acesso, não do Pix.');area.append(aviso);
         if(typeof qrcode!=='function')throw Error('Não foi possível mostrar o QR. Solicite outro acesso após atualizar o painel.');
         const codigo=qrcode(0,'M');codigo.addData(url.href);codigo.make();
         const img=node('img');img.alt='Acesso privado temporário ao pedido de teste';img.src=codigo.createDataURL(5,8);img.style.maxWidth='100%';area.append(img);area.hidden=false;
         setTimeout(()=>{if(versao===versaoQR){area.replaceChildren();area.hidden=true;}},Math.max(0,r.expiraEm-Date.now()));
       }catch(e){responder(e.message,true);}finally{emitir.disabled=false;}
     });sec.append(emitir,area);
   }
   const label=node('label','Status do pedido'),select=node('select');select.setAttribute('aria-label','Status do pedido '+p.id);
   for(const etapa of etapas){const o=node('option',etapa);o.value=etapa;select.append(o);}select.value=p.gestao?.status||'Recebido';label.append(select);sec.append(label);
   const salvar=node('button','Salvar status');salvar.type='button';salvar.addEventListener('click',async()=>{salvar.disabled=true;select.disabled=true;try{const d=await api({acao:'etapa',id:p.id,status:select.value});pedidos=pedidos.map(x=>x.id===p.id?d.pedido:x);responder('Status salvo: '+d.pedido.gestao.status+'.');render(p.id);}catch(e){responder(e.message,true);}finally{salvar.disabled=false;select.disabled=false;}});sec.append(salvar);
   const excluir=node('button','Excluir');excluir.type='button';excluir.className='excluir';excluir.addEventListener('click',async()=>{if(!window.confirm('Excluir o pedido '+p.id+' do painel? Esta ação não cancela nem estorna pagamentos no Mercado Pago.'))return;excluir.disabled=true;try{await api({acao:'excluir',id:p.id,confirmacao:p.id});pedidos=pedidos.filter(x=>x.id!==p.id);render();aviso('Pedido excluído do painel. O pagamento não foi alterado.');}catch(e){aviso(e.message,true);}finally{excluir.disabled=false;}});sec.append(excluir);$('pedidos').append(sec);
  }
  document.dispatchEvent(new CustomEvent('heeeph:pedidos',{detail:{pedidos:pedidos.slice(),pagina:paginaAtual+1,mais:!!proximo}}));
  if(focoId){const card=$('pedido-'+focoId);if(card)card.scrollIntoView({block:'start',behavior:'smooth'});}
 }
 async function carregar(cursor=null,historico=[null],indice=0,rolar=false){
  const atual=++sequencia;
  for(const id of ['carregar','buscarPedidos','anterior','proxima','anteriorRodape','proximaRodape'])$(id).disabled=true;
  aviso('Consultando pedidos no servidor…');
  try{
   const d=await api({acao:'listar',cursor,limite:20,busca:$('busca').value.trim(),filtro:$('filtro').value});
   if(atual!==sequencia)return;
   retornos.clear();pedidos=d.pedidos;cursores=historico;paginaAtual=indice;proximo=d.cursorProximo||null;
   $('avisoAmbiente').textContent=d.teste===false?'Produção. Etapas de entrega manuais; exclusão não cancela nem estorna pagamentos.':'Ambiente de teste. Compras simuladas, sem postagem. Registros de teste expiram em 30 dias.';
   $('filtros').hidden=false;$('sair').hidden=false;render();
   document.dispatchEvent(new Event('heeeph:autenticado'));
   if(rolar){$('contagem').scrollIntoView({block:'start'});$('contagem').focus?.({preventScroll:true});}
   aviso('Página atualizada. A busca percorre os registros no servidor.'+(!pedidos.length&&proximo?' Continue em Próxima página para procurar nos registros mais antigos.':''));
  }catch(e){if(atual===sequencia)aviso(e.message,true);}
  finally{if(atual===sequencia){$('carregar').disabled=false;$('buscarPedidos').disabled=false;for(const id of ['anterior','anteriorRodape'])$(id).disabled=paginaAtual===0;for(const id of ['proxima','proximaRodape'])$(id).disabled=!proximo;}}
 }
 const campoSenha=$('chave');
 const olho=document.createElement('button');
 olho.type='button';
 olho.textContent='👁';
 olho.title='Mostrar senha';
 olho.setAttribute('aria-label','Mostrar senha');
 olho.setAttribute('aria-pressed','false');
 campoSenha.insertAdjacentElement('afterend',olho);
 olho.addEventListener('click',()=>{
  const mostrar=campoSenha.type==='password';
  campoSenha.type=mostrar?'text':'password';
  olho.title=mostrar?'Ocultar senha':'Mostrar senha';
  olho.setAttribute('aria-label',olho.title);
  olho.setAttribute('aria-pressed',String(mostrar));
 });
 $('acesso').addEventListener('submit',e=>{e.preventDefault();chave=$('chave').value;return carregar();});
 $('filtros').addEventListener('submit',e=>{e.preventDefault();return carregar();});
 $('filtro').addEventListener('change',()=>carregar());
 for(const id of ['proxima','proximaRodape'])$(id).addEventListener('click',()=>proximo?carregar(proximo,[...cursores.slice(0,paginaAtual+1),proximo],paginaAtual+1,true):undefined);
 for(const id of ['anterior','anteriorRodape'])$(id).addEventListener('click',()=>paginaAtual?carregar(cursores[paginaAtual-1],cursores,paginaAtual-1,true):undefined);
 $('voltarTopo').addEventListener('click',()=>{$('topoPainel').scrollIntoView({block:'start'});$('topoPainel').focus?.({preventScroll:true});});
 $('imprimir').addEventListener('click',()=>window.print());
 $('sair').addEventListener('click',()=>{sequencia++;chave='';pedidos=[];cursores=[null];paginaAtual=0;proximo=null;retornos.clear();$('chave').value='';$('pedidos').replaceChildren();$('contagem').textContent='';$('filtros').hidden=true;$('paginacao').hidden=$('paginacaoRodape').hidden=true;$('sair').hidden=true;$('carregar').disabled=false;aviso('Acesso encerrado.');document.dispatchEvent(new Event('heeeph:sair'));});
})();
