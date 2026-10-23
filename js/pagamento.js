(() => {
  const $ = id => document.getElementById(id);
  const preco = centavos => (centavos / 100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  // O identificador é opaco: aceitar caracteres ASCII de header, sem espaços/controles.
  const dispositivoValido = valor => typeof valor==='string'&&/^[\x21-\x7e]{1,512}$/.test(valor);
  let entrada, pedido, controller, emPagamento = false, validandoCartao = false, abrindoCartao = false;
  let referenciaCEP;
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
  const chaveRecuperacao='heeeph_pedido_recuperavel';
  let motivoSaida;
  function ocultarPagamentoAntigo(){
    $('pixResultado').hidden=true;$('qr').hidden=true;$('qr').removeAttribute('src');$('pixCodigo').value='';$('copiar').disabled=true;
    $('autenticacaoCartao').hidden=true;$('desafio3ds').hidden=true;$('desafio3ds').removeAttribute('src');
    $('meios').hidden=true;$('recuperarPix').hidden=true;
  }
  function voltarParaEscolha(motivo){
    // Só depois de confirmação persistida no servidor: invalidar a cotação e a preparação antigas.
    sessionStorage.removeItem('heeeph_checkout');sessionStorage.removeItem('heeeph_preparacao');sessionStorage.removeItem('heeeph_pedido_teste');
    localStorage.removeItem(chaveRecuperacao);
    if(pedido?.id)localStorage.setItem('heeeph_ultimo_pedido_encerrado',JSON.stringify({id:pedido.id,em:Date.now()}));
    ocultarPagamentoAntigo();
    window.location.href=motivo==='alterar'?'carrinho.html':'index.html';
  }
  async function concluirSaida(){
    if(emPagamento)return;
    emPagamento=true;$('confirmarSaida').disabled=true;$('conferir').disabled=true;
    try{
      // Uma preparação cuja resposta se perdeu precisa ser recuperada, nunca descartada às cegas.
      if(!pedido&&lerSessao('heeeph_preparacao'))pedido=await preparar();
      if(!pedido){const recibo=reciboSalvo();if(recibo)pedido=recibo;}
      if(pedido){
        ocultarPagamentoAntigo();
        const p=await api({acao:'abandonarPedido',id:pedido.id,motivo:motivoSaida,confirmado:true},true);
        guardar(p);
        if(p.edicaoLiberada!==true||p.saida?.confirmada!==true)throw new Error('O encerramento não foi confirmado. Consulte este pedido antes de iniciar outra cobrança.');
      }
      voltarParaEscolha(motivoSaida);
    }catch(e){
      ocultarPagamentoAntigo();
      avisar(e.message+' Nenhuma nova cobrança foi iniciada.');
      $('mensagemSaida').textContent='Não foi possível liberar a compra. Consulte o pagamento ou tente confirmar novamente. O pedido e seu histórico foram preservados.';
    }finally{emPagamento=false;$('confirmarSaida').disabled=false;}
  }
  function solicitarSaida(motivo){
    if(emPagamento)return;
    motivoSaida=motivo;
    if(!pedido&&!reciboSalvo()&&!lerSessao('heeeph_preparacao'))return concluirSaida();
    $('confirmacaoSaida').hidden=false;
    $('mensagemSaida').textContent='Vamos consultar o Mercado Pago. Se houver Pix pendente elegível, solicitaremos seu cancelamento. Você só poderá continuar após a confirmação. Pagamento aprovado não será cancelado. O histórico será preservado; alterações exigem novo cálculo de frete.';
    $('confirmacaoSaida').scrollIntoView({block:'center'});
  }
  $('alterarPedido').addEventListener('click',()=>solicitarSaida('alterar'));
  $('desistirCompra').addEventListener('click',()=>solicitarSaida('desistir'));
  $('confirmarSaida').addEventListener('click',concluirSaida);
  $('manterPedido').addEventListener('click',()=>{$('confirmacaoSaida').hidden=true;});
  document.querySelectorAll?.('a[href="carrinho.html"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();solicitarSaida('alterar');}));
  function lerSessao(chave){try{return sessionStorage.getItem(chave);}catch(_){return null;}}
  function reciboSalvo() {
    try {
      const r=JSON.parse(localStorage.getItem(chaveRecuperacao));
      if(r && /^[a-f0-9]{32}$/.test(r.id) && /^[a-f0-9]{64}$/.test(r.token) &&
        Number.isFinite(r.guardadoEm) && Date.now()-r.guardadoEm>=0 && Date.now()-r.guardadoEm<86400000)return r;
      localStorage.removeItem(chaveRecuperacao);
    }catch(_){} // Armazenamento indisponível não impede consultar a sessão atual.
    return null;
  }
  function guardar(p) {
    pedido={...pedido,...p};
    const recibo={id:pedido.id,token:pedido.token};
    // Somente a referência de acesso, sem nome, CPF, endereço ou dados de cartão.
    let persistido=false;
    try{
      const salvo=JSON.stringify({...recibo,guardadoEm:Date.now()});
      localStorage.setItem(chaveRecuperacao,salvo);
      persistido=localStorage.getItem(chaveRecuperacao)===salvo;
    }catch(_){}
    try{sessionStorage.setItem('heeeph_pedido_teste',JSON.stringify(recibo));}catch(_){}
    $('persistenciaAviso').hidden=false;
    $('persistenciaAviso').textContent=persistido?'Pedido salvo neste navegador por até 24 horas. Para retomar, use este mesmo endereço neste navegador.':'Não foi possível salvar a referência neste navegador. Mantenha esta aba aberta e guarde o número do pedido. Se sair, consulte a loja antes de repetir o pagamento.';
    $('persistenciaAviso').dataset.tipo=persistido?'info':'erro';
    $('retomada').hidden=true;
  }
  $('retomarPedido').addEventListener('click',async()=>{
    if(emPagamento)return;
    const recibo=reciboSalvo();
    if(!recibo){$('retomada').hidden=true;avisar('A referência local expirou. Consulte a loja com o número do pedido antes de repetir o pagamento.');return;}
    emPagamento=true;$('novoCarrinho').disabled=$('retomarPedido').disabled=$('conferir').disabled=true;
    pedido={id:recibo.id,token:recibo.token};
    try{resultado(await api({acao:'status',id:pedido.id},true));}
    catch(e){avisar(e.message);}
    finally{emPagamento=false;$('novoCarrinho').disabled=$('retomarPedido').disabled=false;}
  });
  $('novoCarrinho').addEventListener('click',async()=>{
    if(emPagamento)return;
    const recibo=reciboSalvo();
    if(!recibo){avisar('Retome o pedido salvo ou consulte a loja antes de preparar outra compra.');return;}
    emPagamento=true;$('novoCarrinho').disabled=$('retomarPedido').disabled=true;
    pedido={id:recibo.id,token:recibo.token};
    avisar('Consultando o pedido anterior antes de conferir outro carrinho…','info');
    try{
      const anterior=await api({acao:'status',id:pedido.id},true);
      if(anterior.saida || anterior.tentativa || (anterior.pagamento && !anterior.pagamento.aprovado && !anterior.pagamento.trocaPermitida)){
        resultado(anterior);
        avisar('O pedido anterior ainda precisa de confirmação. Ele foi retomado; outra compra não foi preparada.','info');return;
      }
      const carrinho=JSON.parse(lerSessao('heeeph_checkout'));
      if(!carrinho?.itens?.length)throw new Error('Volte ao carrinho e confira os itens e o frete. O pedido anterior permanece salvo.');
      // Só uma escolha explícita, após a consulta acima, libera outra preparação.
      // A referência persistente anterior permanece até salvar o novo pedido.
      sessionStorage.removeItem('heeeph_pedido_teste');sessionStorage.removeItem('heeeph_preparacao');
      entrada=carrinho;pedido=null;referenciaCEP=null;
      $('retomada').hidden=$('resultado').hidden=$('meios').hidden=$('pixResultado').hidden=true;
      $('persistenciaAviso').hidden=true;
      $('entrega').hidden=false;$('resumo').replaceChildren();$('total').textContent='';
      $('pedidoResumo').textContent='Pedido anterior preservado: '+recibo.id;
      $('cep').textContent='CEP de entrega: '+entrada.cep;
      $('conferir').disabled=false;
      avisar('Confira os dados para preparar outro pedido. Nenhum pagamento foi iniciado.','info');
      try{await conferirCEP(true);}catch(e){$('cepConferencia').textContent=e.message;}
    }catch(e){avisar(e.message);}
    finally{emPagamento=false;$('novoCarrinho').disabled=$('retomarPedido').disabled=false;}
  });
  async function conferirCEP(preencher=false){
    if(referenciaCEP?.cep!==entrada.cep){
      $('cepConferencia').textContent='Conferindo o endereço do CEP…';
      const r=await fetch('/api/cep?cep='+encodeURIComponent(entrada.cep));
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.mensagem||'Não foi possível conferir o CEP agora. Seus dados foram preservados; tente novamente.');
      referenciaCEP=d;
    }
    const campos=$('entrega').elements;
    if(preencher)for(const k of ['rua','bairro','cidade','uf'])if(!campos[k].value)campos[k].value=referenciaCEP[k]||'';
    $('cepConferencia').textContent='Endereço do CEP: '+[referenciaCEP.rua,referenciaCEP.bairro,referenciaCEP.cidade,referenciaCEP.uf].filter(Boolean).join(' — ')+'. Confira o número e o complemento.';
    return referenciaCEP;
  }
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
    const diagnostico=$('diagnosticoDispositivo');
    const mostrarDiagnostico=teste&&window.location?.href&&new URL(window.location.href).searchParams.get('diagnostico')==='dispositivo';
    if(diagnostico){
      diagnostico.hidden=!mostrarDiagnostico;
      if(mostrarDiagnostico)diagnostico.textContent=dispositivoValido(window.MP_DEVICE_SESSION_ID)?'Diagnóstico de teste: coleta do dispositivo confirmada.':'Diagnóstico de teste: coleta do dispositivo ainda não confirmada. Aguarde alguns segundos e consulte este mesmo pedido novamente.';
    }
    $('avisoAmbiente').textContent=teste?'Ambiente de teste. Use dados e cartões de teste do Mercado Pago e o e-mail test@testuser.com. Nenhum pedido desta página será enviado.':'Pagamento seguro pelo Mercado Pago. Guarde o número do seu pedido.';
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
    $('pixCopiaAviso').textContent='';
    $('copiar').textContent='Copiar código';
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
    if(p.teste!==false)console.info('CHECKOUT_DISPOSITIVO_TESTE '+JSON.stringify({fase:'consulta',obtido:typeof window.MP_DEVICE_SESSION_ID==='string',presente:dispositivoValido(window.MP_DEVICE_SESSION_ID)}));
    ambienteTela(p.teste !== false);
    guardar(p); resumo(p); $('pedidoResumo').textContent='Pedido '+p.id; const pg=p.pagamento;
    if(p.saida){
      ocultarPagamentoAntigo();$('entrega').hidden=true;$('resultado').hidden=false;$('trocarPagamento').hidden=true;
      $('statusTitulo').textContent=p.saida.confirmada?'Tentativa encerrada':'Encerramento em conferência';
      $('statusTexto').textContent=p.saida.confirmada?'O histórico foi preservado. Use Alterar meu pedido para voltar ao carrinho e calcular o frete novamente.':'Uma nova cobrança permanece bloqueada. Consulte o pagamento e confirme novamente a alteração ou desistência.';
      $('pedidoNumero').textContent='Pedido: '+p.id;
      if(pg?.aprovado){$('statusTitulo').textContent='Pagamento aprovado';$('statusTexto').textContent='A compra foi preservada. Para alterações, procure a loja.';}
      return;
    }
    mostrarAutenticacao(pg);
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
    const situacoes={action_required:'aguardando ação',processing:'em análise',expired:'expirado',canceled:'cancelado',cancelled:'cancelado',failed:'recusado',rejected:'recusado'};
    const encerramento=pg.status==='expired'?'O provedor informou que este pagamento expirou.':['canceled','cancelled'].includes(pg.status)?'O provedor informou que este pagamento foi cancelado.':'';
    $('statusTitulo').textContent=pg.aprovado?(p.teste!==false?'Pagamento de teste aprovado':'Pagamento aprovado'):'Pagamento: '+(situacoes[pg.status]||pg.status);
    $('statusTexto').textContent=pg.aprovado?('O servidor confirmou o pagamento e o valor total.'+(p.teste!==false?' Este pedido é apenas um teste.':'')):pg.trocaPermitida?'O pagamento foi recusado. Você pode revisar os dados e escolher outra forma de pagamento. O pedido recusado será preservado.':encerramento?encerramento+' O pedido foi preservado. Consulte a loja com o número do pedido antes de tentar outro pagamento.':'O pagamento ainda precisa de conferência. Consulte novamente antes de tentar outro pagamento.';
    avisar('');
    mostrarPix(pg);
    if(pg.autenticacao?.necessaria)$('statusTexto').textContent='O banco exige autenticação do cartão. Conclua a verificação abaixo e consulte este mesmo pagamento. Não envie outro pagamento.';
  }
  function mostrarAutenticacao(pg){
    const quadro=$('desafio3ds'),secao=$('autenticacaoCartao');
    const necessario=pg?.autenticacao?.necessaria&&!pg.aprovado&&pg.status==='action_required';
    secao.hidden=!necessario;
    let url;
    try{const u=new URL(pg?.autenticacao?.url);if(u.protocol==='https:'&&u.hostname==='www.mercadopago.com.br'&&!u.port&&!u.username&&!u.password&&!u.hash&&/^\/auth\/card\/validation\/pages\/remedies\/[a-zA-Z0-9-]+$/.test(u.pathname))url=u.href;}catch(_){}
    quadro.hidden=!necessario||!url;
    if(quadro.hidden){quadro.removeAttribute('src');}
    else if(quadro.src!==url)quadro.src=url;
    $('autenticacaoTexto').textContent=url?'Faça a verificação solicitada pelo banco. Ao terminar, use Consultar pagamento.':'A autenticação ainda não pôde ser exibida. Consulte este pedido; não inicie outro pagamento.';
  }
  window.addEventListener('message',async e=>{
    const quadro=$('desafio3ds');
    if(quadro.hidden||!quadro.src||e.source!==quadro.contentWindow||e.origin!==new URL(quadro.src).origin||e.data?.status!=='COMPLETE'||$('consultar').disabled)return;
    // A mensagem apenas dispara a consulta; aprovação depende da API autenticada.
    await $('consultar').click();
  });
  async function pagar(metodo, formData, tipo) {
    if(pedido?.saida){avisar('Esta tentativa está encerrada ou em conferência. Consulte o pedido antes de continuar.');return;}
    if(emPagamento) return; emPagamento=true; $('pix').disabled=$('cartao').disabled=true;
    avisar('Enviando o pagamento. Aguarde a confirmação desta tentativa…', 'info');
    try {
      const deviceId=window.MP_DEVICE_SESSION_ID;
      if(pedido.teste!==false)console.info('CHECKOUT_DISPOSITIVO_TESTE '+JSON.stringify({obtido:typeof deviceId==='string',presente:dispositivoValido(deviceId)}));
      resultado(await api({acao:'pagar',id:pedido.id,metodo,formData,tipo,...(dispositivoValido(deviceId)?{deviceId}:{})},true));
    }
    catch(e){ try { const recuperado=await api({acao:'status',id:pedido.id},true); resultado(recuperado); if(recuperado.pagamento){avisar('Pagamento recuperado. Confira a situação abaixo.', 'info');return;} } catch (_) {} avisar(e.message); if(e.dados?.frete) avisar('O frete mudou. Volte ao carrinho e calcule novamente antes de pagar.'); throw e; }
    finally{emPagamento=false; $('pix').disabled=$('cartao').disabled=false;}
  }
  $('entrega').addEventListener('submit',async e=>{
    e.preventDefault();
    if(emPagamento)return;
    if(!entrada?.itens?.length){avisar('Volte ao carrinho e confira o frete antes de continuar.');return;}
    emPagamento=true;
    limparErros(); $('conferir').disabled=true; avisar('Conferindo produtos e frete…', 'info');
    const f=new FormData(e.target), cliente={nome:f.get('nome'),email:f.get('email'),cpf:f.get('cpf'),telefone:f.get('telefone'),termos:f.get('termos')==='on',endereco:{}};
    for(const k of ['rua','numero','complemento','bairro','cidade','uf']) cliente.endereco[k]=f.get(k);
    try{
      const referencia=await conferirCEP();
      const erro=EnderecosHEEEPH.divergencia(cliente.endereco,referencia);
      if(erro){avisar(erro.mensagem,'erro',erro.campo);return;}
      pedido=await preparar({...entrada,cliente});resultado(pedido);avisar('Pedido '+pedido.id+' guardado. Confira o total e escolha o pagamento.', 'info');$('meios').scrollIntoView({block:'start'});
    }
    catch(e){avisar(e.message,'erro',e.dados?.campo);if(e.dados?.frete){entrada.frete=e.dados.frete.preco; sessionStorage.setItem('heeeph_checkout',JSON.stringify(entrada)); avisar(`${e.message} Novo frete: ${preco(Math.round(entrada.frete*100))}. Clique novamente para confirmar esse valor.`);}}
    finally{emPagamento=false;$('conferir').disabled=false;}
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
    if(controller||emPagamento||abrindoCartao)return;
    abrindoCartao=true;$('cartao').disabled=$('pix').disabled=true;
    $('confirmarCartao').hidden=true;
    $('cartao').textContent='Carregando cartão…';
    avisar('Carregando o formulário seguro do Mercado Pago…','info');
    try{
      if(typeof MercadoPago!=='function')throw new Error('Não foi possível carregar o formulário de cartão. Recarregue a página.');
      const mp=new MercadoPago(pedido.publicKey,{locale:'pt-BR'});
      // Consulta pública do SDK: diagnostica acesso à configuração, sem tokenizar ou pagar.
      if(typeof mp.getIdentificationTypes==='function'){
        try{await mp.getIdentificationTypes();}
        catch(e){
          if(pedido.teste!==false){
            const texto=String(e?.message||e?.[0]?.message||e?.cause||'');
            console.warn('CHECKOUT_CARTAO_TESTE '+JSON.stringify({fase:'configuracao_indisponivel',status:Number(e?.status)||null,chavePresente:Boolean(pedido.publicKey),chaveRecusada:/public.?key|invalid.*key|unauthorized|credentials|401|403/i.test(texto),falhaRede:/fetch|network|timeout/i.test(texto)}));
          }
          throw new Error('Não foi possível carregar a configuração do cartão no Mercado Pago. Nenhum pagamento foi enviado. O pedido permanece salvo.');
        }
      }
      let pronto=false;
      const ativar=()=>{if(pronto&&controller)$('confirmarCartao').hidden=false;};
      controller=await mp.bricks().create('cardPayment','cardPaymentBrick_container',{
        initialization:{amount:pedido.total/100},customization:{visual:{style:{theme:'default'},hidePaymentButton:true}},
        callbacks:{onReady:()=>{pronto=true;ativar();avisar('Formulário de cartão carregado. Confira os dados e as parcelas antes de pagar.', 'info');},onError:erroCartao}
      });
      // O SDK também pode resolver com null sem chamar onError.
      if(!controller)throw new Error('O Mercado Pago não conseguiu abrir o formulário de cartão. Nenhum pagamento foi enviado. Tente abrir o cartão novamente; se persistir, recarregue esta mesma página para retomar o pedido.');
      ativar();
      $('cardPaymentBrick_container').scrollIntoView({block:'start'});
    }catch(e){controller=null;avisar(e.message||'Não foi possível abrir o formulário de cartão. Nenhum pagamento foi enviado.');}
    finally{abrindoCartao=false;$('cartao').disabled=$('pix').disabled=false;$('cartao').textContent=pedido.teste!==false?'Pagar com cartão de teste':'Pagar com cartão';}
  });
  function erroCartao(e) {
    const causas={incomplete_fields:'Preencha todos os campos do cartão e selecione as parcelas.',
      no_payment_method_for_provided_bin:'Confira o número e a bandeira do cartão.',
      get_payment_installments_failed:'Não foi possível carregar as parcelas. Reabra o formulário antes de pagar.',
      card_token_creation_failed:'Não foi possível validar o cartão no Mercado Pago. Confira os dados.',
      secure_fields_card_token_creation_failed:'Não foi possível validar os campos seguros do cartão. Reabra o formulário.'};
    avisar(causas[e?.cause||e?.[0]?.cause]||'Não foi possível validar o cartão. Confira todos os campos do formulário.');
  }
  $('confirmarCartao').addEventListener('click',async()=>{
    if(emPagamento||validandoCartao||!controller)return;
    validandoCartao=true;$('confirmarCartao').disabled=$('pix').disabled=$('cartao').disabled=true;
    avisar('Validando os dados do cartão no Mercado Pago…','info');
    let timer,coletado=false;
    try{
      // Métodos oficiais do Brick; os dados brutos continuam nos campos seguros do provedor.
      const coletar=async()=>{
        const retorno=await controller.getFormData();
        const formData=retorno?.formData||retorno;
        if(pedido.teste!==false)console.info('CHECKOUT_CARTAO_TESTE',{fase:'formulario_validado',tokenPresente:Boolean(formData?.token),retornoEnvelopado:Boolean(retorno?.formData)});
        return {formData,adicional:retorno?.additionalData||await controller.getAdditionalData()};
      };
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
  $('copiar').addEventListener('click',async()=>{
    const codigo=$('pixCodigo').value;
    if(!codigo){$('pixCopiaAviso').textContent='Não há código Pix disponível para copiar. Consulte este pedido.';return;}
    $('copiar').disabled=true;
    $('pixCopiaAviso').textContent='Copiando código…';
    try{
      if(typeof navigator.clipboard?.writeText!=='function')throw new Error('Cópia indisponível');
      await navigator.clipboard.writeText(codigo);
      $('copiar').textContent='Copiado!';
      $('pixCopiaAviso').textContent='Código copiado.';
    }catch(_){
      $('pixCopiaAviso').textContent='O navegador não permitiu copiar automaticamente. Toque e segure no código acima, selecione tudo e escolha Copiar.';
    }finally{$('copiar').disabled=!$('pixCodigo').value;}
  });
  window.addEventListener('pagehide',()=>{if(controller)controller.unmount();});
  for(const uf of ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']){const o=document.createElement('option');o.value=o.textContent=uf;$('entrega').elements.uf.append(o);}
  (async()=>{
    try{
      let anterior;
      try{anterior=JSON.parse(lerSessao('heeeph_pedido_teste'));}catch(_){}
      if(anterior?.id&&anterior.token){pedido=anterior;resultado(await api({acao:'status',id:pedido.id},true));return;}
      const recibo=reciboSalvo();
      if(recibo){
        $('retomada').hidden=false;
        $('retomadaTexto').textContent='Há um pedido salvo neste navegador: '+recibo.id+'. Retome-o para conferir o pagamento antes de preparar outro pedido. A referência fica disponível por até 24 horas desde a última consulta.';
      }
      if(lerSessao('heeeph_preparacao')){resultado(await preparar());return;}
      ambienteTela((await api({acao:'configuracao'})).teste !== false);
      if(recibo){
        $('entrega').hidden=true;
        try{$('novoCarrinho').hidden=!JSON.parse(lerSessao('heeeph_checkout'))?.itens?.length;}catch(_){}
        $('pedidoResumo').textContent='Pedido salvo: '+recibo.id;
        avisar('Há um pedido salvo. Use o botão de retomada para consultar esta mesma tentativa, sem gerar outro pagamento.','info');
        return;
      }
      entrada=JSON.parse(sessionStorage.getItem('heeeph_checkout'));if(!entrada?.itens?.length)throw new Error('Volte ao carrinho, escolha o frete e clique em Ir para pagamento.');
      $('cep').textContent='CEP de entrega: '+entrada.cep;
      $('conferir').disabled=false;
      avisar('Preencha os dados para conferir o pedido.', 'info');
      try{await conferirCEP(true);}catch(e){$('cepConferencia').textContent=e.message;avisar(e.message);}
    }catch(e){avisar(e.message);}
  })();
})();


