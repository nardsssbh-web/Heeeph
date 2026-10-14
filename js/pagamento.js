(() => {
  const $ = id => document.getElementById(id);
  const preco = centavos => (centavos / 100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  let entrada, pedido, controller, emPagamento = false;
  function limparErros() {
    $('entrega').querySelectorAll('[aria-invalid]').forEach(c => {
      c.removeAttribute('aria-invalid');
      c.removeAttribute('aria-describedby');
    });
    $('entrega').querySelectorAll('.erro-campo').forEach(e => e.remove());
  }
  function campoDaMensagem(texto) {
    const regras = {nome:/nome|sobrenome/i,email:/e-mail/i,cpf:/CPF/i,telefone:/telefone|DDD/i,
      rua:/a rua/i,numero:/o número/i,bairro:/o bairro/i,cidade:/a cidade/i,uf:/estado|UF/i,
      complemento:/complemento/i,termos:/Aceite os termos/i};
    return Object.keys(regras).find(k => regras[k].test(texto));
  }
  function avisar(texto, tipo = 'erro', campo) {
    const mensagem = $('mensagem');
    mensagem.textContent = texto;
    mensagem.dataset.tipo = tipo;
    mensagem.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    mensagem.setAttribute('aria-live', tipo === 'erro' ? 'assertive' : 'polite');
    if (!texto || tipo !== 'erro') return;
    limparErros();
    const controle = !$('entrega').hidden && $('entrega').elements[campo || campoDaMensagem(texto)];
    if (controle) {
      const detalhe = document.createElement('span');
      detalhe.id = 'erro-' + controle.name;
      detalhe.className = 'erro-campo';
      detalhe.textContent = texto;
      controle.closest('label').append(detalhe);
      controle.setAttribute('aria-invalid', 'true');
      controle.setAttribute('aria-describedby', detalhe.id);
      controle.focus({preventScroll:true});
      controle.scrollIntoView({block:'center'});
    } else mensagem.scrollIntoView({block:'center'});
  }
  $('entrega').addEventListener('invalid', e => {
    e.preventDefault();
    const primeiro = Array.from($('entrega').elements).find(c => c.validity && !c.validity.valid);
    if (e.target !== primeiro) return;
    const texto = e.target.name === 'termos' ? 'Aceite os termos e a política de privacidade.' :
      e.target.validity.typeMismatch ? 'Confira seu e-mail.' :
      'Preencha ' + e.target.closest('label').firstChild.textContent.trim().toLowerCase() + '.';
    avisar(texto, 'erro', e.target.name);
  }, true);
  $('entrega').addEventListener('input', e => {
    if (!e.target.hasAttribute('aria-invalid')) return;
    limparErros();
    avisar('', 'info');
  });
  function linha(texto) { const p = document.createElement('p'); p.className='item'; p.textContent=texto; $('resumo').append(p); }
  function resumo(p) {
    $('resumo').replaceChildren();
    p.itens.forEach(i=>linha(`${i.quantidade} × ${i.nome} — ${i.medida} — ${preco(i.centavos*i.quantidade)}`));
    linha(`Entrega: ${p.frete.transportadora} — ${p.frete.servico} — ${preco(p.frete.centavos)}`);
    p.pacotes.forEach((x,i)=>linha(`Pacote ${i+1}: ${x.gramas} g — ${x.length} × ${x.width} × ${x.height} cm${x.estimado?' (peso estimado)':''}`));
    $('total').textContent='Total: '+preco(p.total);
  }
  async function api(body, autenticado = false) {
    const r = await fetch('/api/checkout', {method:'POST',headers:{'Content-Type':'application/json',...(autenticado?{Authorization:'Bearer '+pedido.token}:{})},body:JSON.stringify(body)});
    const d = await r.json().catch(() => ({mensagem:'O servidor não respondeu corretamente. Consulte o pedido antes de repetir o pagamento.'}));
    if (!r.ok) { const e = new Error(d.mensagem || 'Não foi possível continuar.'); e.dados=d; throw e; }
    return d;
  }
  function guardar(p) { pedido={...pedido,...p}; sessionStorage.setItem('heeeph_pedido_teste',JSON.stringify({id:pedido.id,token:pedido.token})); }
  function resultado(p) {
    guardar(p); resumo(p); const pg=p.pagamento;
    $('recuperarPix').hidden = !p.recuperarPix || Boolean(pg);
    if (!pg) {
      $('entrega').hidden=true; $('meios').hidden=Boolean(p.tentativa || p.expirado); $('resultado').hidden=!p.tentativa;
      $('pixResultado').hidden=true; $('qr').hidden=true;
      if (p.tentativa) {
        $('statusTitulo').textContent='Tentativa em conferência';
        $('pedidoNumero').textContent='Pedido de teste: '+p.id;
        $('statusTexto').textContent='O servidor consulta o Mercado Pago pela referência deste pedido. Enquanto o resultado não for confirmado, uma nova cobrança fica bloqueada.';
        avisar('A tentativa ainda não foi localizada ou confirmada. Aguarde e consulte novamente.', 'info');
      } else if (p.expirado) { avisar('A sessão expirou. Volte ao carrinho para conferir os valores.'); }
      else avisar(p.ultimaFalha?.mensagem || 'Pedido guardado. Escolha como pagar.', p.ultimaFalha ? 'erro' : 'info');
      return;
    }
    $('entrega').hidden=true; $('meios').hidden=true; $('resultado').hidden=false;
    $('pedidoNumero').textContent='Pedido de teste: '+p.id;
    $('statusTitulo').textContent=pg.aprovado?'Pagamento de teste aprovado':'Pagamento de teste: '+(pg.status==='action_required'?'aguardando ação':pg.status==='processing'?'em análise':pg.status);
    $('statusTexto').textContent=pg.aprovado?'O servidor confirmou o pagamento e o valor total. Este pedido é apenas um teste.':'O pagamento ainda não foi confirmado. Consulte novamente antes de tentar outro pagamento.';
    $('pixResultado').hidden=!pg.pix;
    if(pg.pix){ $('pixCodigo').value=pg.pix.codigo; if(pg.pix.imagem && /^[A-Za-z0-9+/=]+$/.test(pg.pix.imagem)){ $('qr').src='data:image/png;base64,'+pg.pix.imagem; $('qr').hidden=false; }else $('qr').hidden=true; }
    avisar('');
  }
  async function pagar(metodo, formData, tipo) {
    if(emPagamento) return; emPagamento=true; $('pix').disabled=$('cartao').disabled=true;
    try { resultado(await api({acao:'pagar',id:pedido.id,metodo,formData,tipo},true)); }
    catch(e){ try { const recuperado=await api({acao:'status',id:pedido.id},true); resultado(recuperado); if(recuperado.pagamento){avisar('Pagamento recuperado. Confira a situação abaixo.', 'info');return;} } catch (_) {} avisar(e.message); if(e.dados?.frete) avisar('O frete mudou. Volte ao carrinho e calcule novamente antes de pagar.'); throw e; }
    finally{emPagamento=false; $('pix').disabled=$('cartao').disabled=false;}
  }
  $('entrega').addEventListener('submit',async e=>{
    e.preventDefault(); limparErros(); $('conferir').disabled=true; avisar('Conferindo produtos e frete…', 'info');
    const f=new FormData(e.target), cliente={nome:f.get('nome'),email:f.get('email'),cpf:f.get('cpf'),telefone:f.get('telefone'),termos:f.get('termos')==='on',endereco:{}};
    for(const k of ['rua','numero','complemento','bairro','cidade','uf']) cliente.endereco[k]=f.get(k);
    try{pedido=await api({...entrada,cliente,acao:'preparar'});guardar(pedido);resumo(pedido);$('entrega').hidden=true;$('meios').hidden=false;avisar('Confira o total e escolha o pagamento de teste.', 'info');$('meios').scrollIntoView({block:'start'});}
    catch(e){avisar(e.message);if(e.dados?.frete){entrada.frete=e.dados.frete.preco; sessionStorage.setItem('heeeph_checkout',JSON.stringify(entrada)); avisar(`${e.message} Novo frete: ${preco(Math.round(entrada.frete*100))}. Clique novamente para confirmar esse valor.`);}}
    finally{$('conferir').disabled=false;}
  });
  $('pix').addEventListener('click',()=>pagar('pix').catch(()=>{}));
  $('cartao').addEventListener('click',async()=>{
    if(controller||emPagamento)return;
    try{
      if(typeof MercadoPago!=='function')throw new Error('Não foi possível carregar o formulário de cartão. Recarregue a página.');
      const mp=new MercadoPago(pedido.publicKey,{locale:'pt-BR'});
      controller=await mp.bricks().create('cardPayment','cardPaymentBrick_container',{
        initialization:{amount:pedido.total/100},customization:{visual:{style:{theme:'default'}}},
        callbacks:{onReady:()=>{},onSubmit:(formData,additionalData)=>pagar('cartao',formData,additionalData?.paymentTypeId || formData.payment_type_id),onError:()=>avisar('Confira os dados do cartão de teste.')}
      });
    }catch(e){avisar(e.message);}
  });
  $('recuperarPix').addEventListener('click', async () => {
    if (emPagamento) return;
    emPagamento=true; $('recuperarPix').disabled=true;
    try { resultado(await api({acao:'recuperarPix',id:pedido.id},true)); }
    catch(e) { try { resultado(await api({acao:'status',id:pedido.id},true)); } catch (_) {} avisar(e.message); }
    finally { emPagamento=false; $('recuperarPix').disabled=false; }
  });
  $('consultar').addEventListener('click',async()=>{
    $('consultar').disabled=true; $('consultar').textContent='Consultando…'; avisar('Consultando o pagamento…', 'info');
    try{const p=await api({acao:'status',id:pedido.id},true);resultado(p);avisar('Consulta atualizada às '+new Date().toLocaleTimeString('pt-BR')+'. '+(p.pagamento?.aprovado?'Pagamento de teste aprovado.':p.tentativa?'Tentativa ainda em conferência.':p.pagamento?'Pagamento ainda não aprovado.':'Nenhum pagamento iniciado.'), 'info');}catch(e){avisar(e.message);}finally{$('consultar').disabled=false; $('consultar').textContent='Atualizar situação do pagamento';}
  });
  $('copiar').addEventListener('click',()=>navigator.clipboard.writeText($('pixCodigo').value).then(()=>avisar('Código copiado.', 'info')).catch(()=>avisar('Selecione o código e copie.')));
  window.addEventListener('pagehide',()=>{if(controller)controller.unmount();});
  for(const uf of ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']){const o=document.createElement('option');o.value=o.textContent=uf;$('entrega').elements.uf.append(o);}
  (async()=>{
    try{
      entrada=JSON.parse(sessionStorage.getItem('heeeph_checkout'));if(!entrada?.itens?.length)throw new Error('Volte ao carrinho, escolha o frete e clique em Ir para pagamento.');
      $('cep').textContent='CEP de entrega: '+entrada.cep;
      const anterior=JSON.parse(sessionStorage.getItem('heeeph_pedido_teste'));
      if(anterior?.id&&anterior.token){pedido=anterior;resultado(await api({acao:'status',id:pedido.id},true));}
      else avisar('Preencha os dados para conferir o pedido.', 'info');
    }catch(e){avisar(e.message);}
  })();
})();


