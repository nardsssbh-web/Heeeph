(() => {
  const $ = id => document.getElementById(id);
  const preco = centavos => (centavos / 100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  let entrada, pedido, controller, emPagamento = false, validandoCartao = false;
  $('conferir').disabled=true;
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
    if (!r.ok) { const e = new Error(d.mensagem || 'Não foi possível continuar.'); e.dados=d; e.status=r.status; throw e; }
    return d;
  }
  function guardar(p) { pedido={...pedido,...p}; sessionStorage.setItem('heeeph_pedido_teste',JSON.stringify({id:pedido.id,token:pedido.token})); }
  async function preparar(body) {
    let pendente=JSON.parse(sessionStorage.getItem('heeeph_preparacao'));
    if(!pendente){
      const chavePreparacao=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
      pendente={...body,acao:'preparar',chavePreparacao};
      sessionStorage.setItem('heeeph_preparacao',JSON.stringify(pendente));
    }
    try {
      const p=await api(pendente); guardar(p);
      sessionStorage.removeItem('heeeph_preparacao'); return p;
    } catch(e) {
      if([400,422].includes(e.status)||e.dados?.frete)sessionStorage.removeItem('heeeph_preparacao');
      throw e;
    }
  }
  function ambienteTela(teste) {
    $('avisoAmbiente').textContent=teste?'Ambiente de teste. Use dados e cartões de teste do Mercado Pago. Nenhum pedido desta página será enviado.':'Pagamento seguro pelo Mercado Pago. Guarde o número do seu pedido.';
    $('meiosTitulo').textContent=teste?'Pagamento de teste':'Pagamento';
    $('meiosTexto').textContent=teste?'Use o e-mail do comprador e cartões de teste do Mercado Pago.':'Escolha Pix ou cartão e confira o total antes de confirmar.';
    $('pix').textContent=teste?'Gerar Pix de teste':'Gerar Pix';
    $('cartao').textContent=teste?'Pagar com cartão de teste':'Pagar com cartão';
    $('envioAviso').textContent=teste?'Pedido de teste: não haverá postagem.':'As etapas de entrega são atualizadas manualmente pela loja.';
  }
  function mostrarPix(pg) {
    const qr = $('qr'), pix = pg?.pix;
    qr.hidden=true; qr.removeAttribute('src'); qr.onerror=null;
    $('pixCodigo').value=pix?.codigo || '';
    $('copiar').disabled=!pix?.codigo;
    const encerrado=pg?.aprovado||['failed','canceled','cancelled','expired','rejected'].includes(pg?.status);
    $('pixResultado').hidden=!pix||encerrado;
    if(!pix||encerrado){$('pixCodigo').value='';$('copiar').disabled=true;return;}
    function gerarLocalmente() {
      qr.onerror=null; qr.hidden=true;
      if(!pix.codigo || typeof qrcode !== 'function') return false;
      try {
        qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8'];
        const codigo=qrcode(0,'M'); codigo.addData(pix.codigo); codigo.make();
        qr.src=codigo.createDataURL(6,24); qr.hidden=false; return true;
      } catch (_) { return false; }
    }
    if(pix.imagem && /^[A-Za-z0-9+/=]+$/.test(pix.imagem)) {
      qr.onerror=()=>{if(!gerarLocalmente())avisar('Não foi possível exibir o QR Code. Use o código copia e cola ou consulte o pagamento.', 'info');};
      qr.src='data:image/png;base64,'+pix.imagem; qr.hidden=false;
    } else if(!gerarLocalmente()) {
      avisar(pix.codigo?'Use o código Pix copia e cola.':'O Mercado Pago ainda não retornou os dados do Pix. Consulte o pagamento desta tentativa; não gere outra cobrança.', 'info');
    }
  }
  function resultado(p) {
    ambienteTela(p.teste !== false);
    guardar(p); resumo(p); $('pedidoResumo').textContent='Pedido '+p.id; const pg=p.pagamento;
    $('trocarPagamento').hidden=!pg?.trocaPermitida;
    $('recuperarPix').hidden = !p.recuperarPix || Boolean(pg);
    if (!pg) {
      $('entrega').hidden=true; $('meios').hidden=Boolean(p.tentativa || p.expirado); $('resultado').hidden=!p.tentativa;
      $('pixResultado').hidden=true; $('qr').hidden=true;
      if (p.tentativa) {
        $('statusTitulo').textContent='Tentativa em conferência';
        $('pedidoNumero').textContent=(p.teste!==false?'Pedido de teste: ':'Pedido: ')+p.id;
        $('statusTexto').textContent='O servidor consulta o Mercado Pago pela referência deste pedido. Enquanto o resultado não for confirmado, uma nova cobrança fica bloqueada.';
        avisar('A tentativa ainda não foi localizada ou confirmada. Aguarde e consulte novamente.', 'info');
      } else if (p.expirado) { avisar('A sessão expirou. Volte ao carrinho para conferir os valores.'); }
      else avisar(p.ultimaFalha?.mensagem || 'Pedido guardado. Escolha como pagar.', p.ultimaFalha ? 'erro' : 'info');
      return;
    }
    $('entrega').hidden=true; $('meios').hidden=true; $('resultado').hidden=false;
    $('pedidoNumero').textContent=(p.teste!==false?'Pedido de teste: ':'Pedido: ')+p.id;
    $('statusTitulo').textContent=pg.aprovado?(p.teste!==false?'Pagamento de teste aprovado':'Pagamento aprovado'):'Pagamento: '+(pg.status==='action_required'?'aguardando ação':pg.status==='processing'?'em análise':pg.status);
    $('statusTexto').textContent=pg.aprovado?('O servidor confirmou o pagamento e o valor total.'+(p.teste!==false?' Este pedido é apenas um teste.':'')):pg.trocaPermitida?'O pagamento foi recusado. Você pode revisar os dados e escolher outra forma de pagamento. O pedido recusado será preservado.':'O pagamento ainda precisa de conferência. Consulte novamente antes de tentar outro pagamento.';
    avisar('');
    mostrarPix(pg);
  }
  async function pagar(metodo, formData, tipo) {
    if(emPagamento) return; emPagamento=true; $('pix').disabled=$('cartao').disabled=true;
    avisar('Enviando o pagamento. Aguarde a confirmação desta tentativa…', 'info');
    try { resultado(await api({acao:'pagar',id:pedido.id,metodo,formData,tipo},true)); }
    catch(e){ try { const recuperado=await api({acao:'status',id:pedido.id},true); resultado(recuperado); if(recuperado.pagamento){avisar('Pagamento recuperado. Confira a situação abaixo.', 'info');return;} } catch (_) {} avisar(e.message); if(e.dados?.frete) avisar('O frete mudou. Volte ao carrinho e calcule novamente antes de pagar.'); throw e; }
    finally{emPagamento=false; $('pix').disabled=$('cartao').disabled=false;}
  }
  $('entrega').addEventListener('submit',async e=>{
    e.preventDefault();
    if(!entrada?.itens?.length){avisar('Volte ao carrinho e confira o frete antes de continuar.');return;}
    limparErros(); $('conferir').disabled=true; avisar('Conferindo produtos e frete…', 'info');
    const f=new FormData(e.target), cliente={nome:f.get('nome'),email:f.get('email'),cpf:f.get('cpf'),telefone:f.get('telefone'),termos:f.get('termos')==='on',endereco:{}};
    for(const k of ['rua','numero','complemento','bairro','cidade','uf']) cliente.endereco[k]=f.get(k);
    try{pedido=await preparar({...entrada,cliente});resultado(pedido);avisar('Pedido '+pedido.id+' guardado. Confira o total e escolha o pagamento.', 'info');$('meios').scrollIntoView({block:'start'});}
    catch(e){avisar(e.message);if(e.dados?.frete){entrada.frete=e.dados.frete.preco; sessionStorage.setItem('heeeph_checkout',JSON.stringify(entrada)); avisar(`${e.message} Novo frete: ${preco(Math.round(entrada.frete*100))}. Clique novamente para confirmar esse valor.`);}}
    finally{$('conferir').disabled=false;}
  });
  $('pix').addEventListener('click',()=>pagar('pix').catch(()=>{}));
  $('trocarPagamento').addEventListener('click',async()=>{
    if(emPagamento)return;emPagamento=true;$('trocarPagamento').disabled=true;
    avisar('Conferindo a tentativa anterior antes de liberar a troca…','info');
    try{
      const d=await api({acao:'liberarNovaCompra',id:pedido.id},true);
      if(controller){controller.unmount();controller=null;}
      $('confirmarCartao').hidden=true;
      entrada=d.checkout;sessionStorage.setItem('heeeph_checkout',JSON.stringify(entrada));
      sessionStorage.removeItem('heeeph_pedido_teste');sessionStorage.removeItem('heeeph_preparacao');pedido=null;
      $('resultado').hidden=$('meios').hidden=true;$('entrega').hidden=false;
      $('conferir').disabled=false;
      $('pedidoResumo').textContent='Revise os dados para preparar um novo pedido.';
      $('cep').textContent='CEP de entrega: '+entrada.cep;
      avisar('Revise os dados de entrega. Ao continuar, um novo pedido será preparado para você escolher Pix ou cartão. Nenhum pagamento foi iniciado.','info');
      $('entrega').scrollIntoView({block:'start'});
    }catch(e){avisar(e.message);}
    finally{emPagamento=false;$('trocarPagamento').disabled=false;}
  });
  $('cartao').addEventListener('click',async()=>{
    if(controller||emPagamento)return;
    try{
      if(typeof MercadoPago!=='function')throw new Error('Não foi possível carregar o formulário de cartão. Recarregue a página.');
      const mp=new MercadoPago(pedido.publicKey,{locale:'pt-BR'});
      let pronto=false;
      const ativar=()=>{if(pronto&&controller)$('confirmarCartao').hidden=false;};
      controller=await mp.bricks().create('cardPayment','cardPaymentBrick_container',{
        initialization:{amount:pedido.total/100},customization:{visual:{style:{theme:'default'},hidePaymentButton:true}},
        callbacks:{onReady:()=>{pronto=true;ativar();avisar('Formulário de cartão carregado. Confira os dados e as parcelas antes de pagar.', 'info');},onError:erroCartao}
      });
      ativar();
    }catch(e){avisar(e.message);}
  });
  function erroCartao(e) {
    const causas={incomplete_fields:'Preencha todos os campos do cartão e selecione as parcelas.',
      no_payment_method_for_provided_bin:'Confira o número e a bandeira do cartão.',
      get_payment_installments_failed:'Não foi possível carregar as parcelas. Reabra o formulário antes de pagar.',
      card_token_creation_failed:'Não foi possível validar o cartão no Mercado Pago. Confira os dados.',
      secure_fields_card_token_creation_failed:'Não foi possível validar os campos seguros do cartão. Reabra o formulário.'};
    avisar(causas[e?.cause]||'Não foi possível validar o cartão. Confira todos os campos do formulário.');
  }
  $('confirmarCartao').addEventListener('click',async()=>{
    if(emPagamento||validandoCartao||!controller)return;
    validandoCartao=true;$('confirmarCartao').disabled=$('pix').disabled=$('cartao').disabled=true;
    avisar('Validando os dados do cartão no Mercado Pago…','info');
    let timer,coletado=false;
    try{
      // Métodos oficiais do Brick; os dados brutos continuam nos campos seguros do provedor.
      const coletar=async()=>{const formData=await controller.getFormData();return {formData,adicional:await controller.getAdditionalData()};};
      const {formData,adicional}=await Promise.race([coletar(),new Promise((_,rejeitar)=>{timer=setTimeout(()=>rejeitar({cause:'card_token_creation_failed'}),20000);})]);
      clearTimeout(timer);
      if(!formData?.token)throw {cause:'card_token_creation_failed'};
      coletado=true;validandoCartao=false;
      await pagar('cartao',formData,adicional?.paymentTypeId||formData.payment_type_id);
    }catch(e){if(!coletado)erroCartao(e);}
    finally{clearTimeout(timer);validandoCartao=false;$('confirmarCartao').disabled=$('pix').disabled=$('cartao').disabled=false;}
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
    try{const p=await api({acao:'status',id:pedido.id},true);resultado(p);avisar('Consulta atualizada às '+new Date().toLocaleTimeString('pt-BR')+'. '+(p.pagamento?.aprovado?'Pagamento aprovado.':p.tentativa?'Tentativa ainda em conferência.':p.pagamento?'Pagamento ainda não aprovado.':'Nenhum pagamento iniciado.'), 'info');}catch(e){avisar(e.message);}finally{$('consultar').disabled=false; $('consultar').textContent='Consultar Pagamento';}
  });
  $('copiar').addEventListener('click',()=>navigator.clipboard.writeText($('pixCodigo').value).then(()=>avisar('Código copiado.', 'info')).catch(()=>avisar('Selecione o código e copie.')));
  window.addEventListener('pagehide',()=>{if(controller)controller.unmount();});
  for(const uf of ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']){const o=document.createElement('option');o.value=o.textContent=uf;$('entrega').elements.uf.append(o);}
  (async()=>{
    try{
      const anterior=JSON.parse(sessionStorage.getItem('heeeph_pedido_teste'));
      if(anterior?.id&&anterior.token){pedido=anterior;resultado(await api({acao:'status',id:pedido.id},true));return;}
      if(sessionStorage.getItem('heeeph_preparacao')){resultado(await preparar());return;}
      ambienteTela((await api({acao:'configuracao'})).teste !== false);
      entrada=JSON.parse(sessionStorage.getItem('heeeph_checkout'));if(!entrada?.itens?.length)throw new Error('Volte ao carrinho, escolha o frete e clique em Ir para pagamento.');
      $('cep').textContent='CEP de entrega: '+entrada.cep;
      $('conferir').disabled=false;
      avisar('Preencha os dados para conferir o pedido.', 'info');
    }catch(e){avisar(e.message);}
  })();
})();


