const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const base={id:'a'.repeat(32),teste:true,itens:[],pacotes:[],subtotal:0,frete:{centavos:0,servico:'PAC',transportadora:'Correios'},total:100,publicKey:'publica',pagamento:null,tentativa:false};
async function tela(resposta,armazenamento={},opcoes={}){
 const nodes={},chamadas=[];const el=()=>({hidden:false,disabled:false,textContent:'',dataset:{},elements:{uf:{append(){}}},querySelectorAll:()=>[],addEventListener(n,fn){this[n]=fn;},replaceChildren(){},append(){},setAttribute(){},removeAttribute(n){delete this[n];},scrollIntoView(){}});
 for(const id of ['entrega','mensagem','resumo','total','meios','resultado','pedidoNumero','statusTitulo','statusTexto','pixResultado','pixCodigo','qr','pix','cartao','conferir','consultar','copiar','cep','cepConferencia','recuperarPix','pedidoResumo','avisoAmbiente','meiosTitulo','meiosTexto','envioAviso','trocarPagamento','confirmarCartao'])nodes[id]=el();
 for(const k of ['nome','email','cpf','telefone','rua','numero','complemento','bairro','cidade','uf','termos'])nodes.entrega.elements[k]=Object.assign(el(),{name:k,value:opcoes.campos?.[k]||'',focus(){},closest(){return {append(){}};}});
 const values={heeeph_checkout:JSON.stringify({cep:'01001000',itens:[{id:'x'}]}),heeeph_pedido_teste:JSON.stringify({id:base.id,token:'b'.repeat(64)})};
 Object.assign(values,armazenamento);
 const ctx=vm.createContext({console,setTimeout,clearTimeout,FormData:class{constructor(form){this.form=form;}get(k){return this.form.elements[k].value;}},EnderecosHEEEPH:require('../js/enderecos'),MercadoPago:opcoes.sdk,qrcode:require('../js/vendor/qrcode-generator-1.4.4'),fetch:async(url,opts)=>{if(url.startsWith('/api/cep?')){chamadas.push('cep');return {ok:!opcoes.cepFalha,json:async()=>opcoes.cepFalha?{mensagem:'CEP indisponível. Dados preservados.'}:{cep:'01001000',rua:'Praça da Sé',bairro:'Sé',cidade:'São Paulo',uf:'SP'}};}chamadas.push(JSON.parse(opts.body).acao);return {ok:!opcoes.falhar,status:opcoes.falhar?403:200,json:async()=>({...base,...resposta})};},document:{getElementById:id=>nodes[id],createElement:el},window:{addEventListener(){}},navigator:{},sessionStorage:{getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v,removeItem:k=>delete values[k]}});
 for(const id of ['retomada','retomadaTexto','retomarPedido','persistenciaAviso','novoCarrinho'])nodes[id]=Object.assign(el(),{hidden:true});
 nodes.cardPaymentBrick_container=el();
 for(const id of ['autenticacaoCartao','desafio3ds','autenticacaoTexto'])nodes[id]=el();
 nodes.desafio3ds.contentWindow={};nodes.desafio3ds.hidden=true;
 const eventos={};ctx.URL=URL;ctx.window.addEventListener=(nome,fn)=>eventos[nome]=fn;nodes.eventos=eventos;
 const recibos={...opcoes.recibos};
 nodes.pixCopiaAviso=el();
 ctx.navigator={clipboard:opcoes.clipboard};
 if(opcoes.sessaoBloqueada)ctx.sessionStorage={getItem(){throw Error('SecurityError');},setItem(){throw Error('SecurityError');}};
 ctx.localStorage={getItem:k=>{if(opcoes.storageBloqueado)throw Error('SecurityError');return recibos[k]||null;},setItem:(k,v)=>{if(opcoes.storageBloqueado)throw Error('QuotaExceededError');if(!opcoes.storageIgnoraGravacao)recibos[k]=v;},removeItem:k=>delete recibos[k]};
 const enviados=[],fetchOriginal=ctx.fetch;
 ctx.fetch=async(url,opts)=>{if(url==='/api/checkout')enviados.push(JSON.parse(opts.body));return fetchOriginal(url,opts);};
 ctx.window.MP_DEVICE_SESSION_ID=opcoes.deviceId;nodes.enviados=enviados;
 vm.runInContext(fs.readFileSync('js/pagamento.js','utf8'),ctx);await new Promise(setImmediate);nodes.chamadas=chamadas;nodes.recibos=recibos;return nodes;
}

test('identificador do SDK acompanha apenas o envio de pagamento e não fica no recibo',async()=>{
 const n=await tela({}, {},{deviceId:'device-ficticio_123'});
 await n.pix.click();
 assert.equal(n.enviados.find(r=>r.acao==='pagar').deviceId,'device-ficticio_123');
 assert.equal(n.enviados.filter(r=>r.acao!=='pagar').some(r=>'deviceId' in r),false);
 assert.equal(JSON.stringify(n.recibos).includes('device-ficticio_123'),false);
 for(const deviceId of [undefined,'invalido\r\nheader',{},'x'.repeat(257)]){
  const t=await tela({}, {},{deviceId});await t.pix.click();
  assert.equal('deviceId' in t.enviados.find(r=>r.acao==='pagar'),false);
 }
});

test('retoma a mesma referência após perder sessão, sem carrinho e sem criar pagamento',async()=>{
 const recibo={id:base.id,token:'b'.repeat(64),guardadoEm:Date.now()};
 const n=await tela({pagamento:{status:'action_required',pix:{codigo:'000201TESTE'}}},{heeeph_pedido_teste:null,heeeph_checkout:null},{recibos:{heeeph_pedido_recuperavel:JSON.stringify(recibo)}});
 assert.equal(n.retomada.hidden,false);assert.match(n.retomadaTexto.textContent,new RegExp(base.id));
 assert.equal(n.entrega.hidden,true);assert.doesNotMatch(n.mensagem.textContent,/Volte ao carrinho/);
 assert.deepEqual(n.chamadas,['configuracao']);
 await n.retomarPedido.click();
 assert.deepEqual(n.chamadas,['configuracao','status']);assert.match(n.pedidoResumo.textContent,new RegExp(base.id));assert.equal(n.entrega.hidden,true);assert.equal(n.retomada.hidden,true);assert.equal(n.pixCodigo.value,'000201TESTE');
 const salvo=JSON.parse(n.recibos.heeeph_pedido_recuperavel);assert.deepEqual(Object.keys(salvo).sort(),['guardadoEm','id','token']);
});

test('referência expirada ou inválida não oferece acesso nem inicia consulta',async()=>{
 for(const r of [{id:base.id,token:'b'.repeat(64),guardadoEm:Date.now()-86400001},{id:base.id,token:'inválido',guardadoEm:Date.now()}]){
  const n=await tela({}, {heeeph_pedido_teste:null},{recibos:{heeeph_pedido_recuperavel:JSON.stringify(r)}});
  assert.equal(n.retomada.hidden,true);assert.deepEqual(n.chamadas,['configuracao','cep']);assert.equal(n.recibos.heeeph_pedido_recuperavel,undefined);
 }
});

test('armazenamento persistente bloqueado mantém recuperação pela sessão',async()=>{
 const n=await tela({pagamento:{status:'processed',aprovado:true}},{},{storageBloqueado:true});
 assert.deepEqual(n.chamadas,['status']);assert.equal(n.statusTitulo.textContent,'Pagamento de teste aprovado');
 assert.equal(n.persistenciaAviso.hidden,false);assert.match(n.persistenciaAviso.textContent,/Não foi possível salvar/);
});

test('gravação ignorada pelo navegador não anuncia retomada disponível',async()=>{
 const n=await tela({}, {},{storageIgnoraGravacao:true});
 assert.equal(n.persistenciaAviso.dataset.tipo,'erro');assert.match(n.persistenciaAviso.textContent,/Mantenha esta aba aberta/);
});

test('sessão com JSON inválido ainda oferece referência persistente válida',async()=>{
 const recibo={id:base.id,token:'b'.repeat(64),guardadoEm:Date.now()};
 const n=await tela({}, {heeeph_pedido_teste:'{'},{recibos:{heeeph_pedido_recuperavel:JSON.stringify(recibo)}});
 assert.equal(n.retomada.hidden,false);assert.equal(n.entrega.hidden,true);assert.deepEqual(n.chamadas,['configuracao']);
 await n.retomarPedido.click();assert.deepEqual(n.chamadas,['configuracao','status']);assert.match(n.persistenciaAviso.textContent,/Pedido salvo neste navegador/);
});

test('sessão indisponível não impede retomar pela referência persistente',async()=>{
 const recibo={id:base.id,token:'b'.repeat(64),guardadoEm:Date.now()};
 const n=await tela({}, {},{sessaoBloqueada:true,recibos:{heeeph_pedido_recuperavel:JSON.stringify(recibo)}});
 assert.equal(n.retomada.hidden,false);assert.equal(n.entrega.hidden,true);await n.retomarPedido.click();
 assert.deepEqual(n.chamadas,['configuracao','status']);assert.match(n.pedidoResumo.textContent,new RegExp(base.id));assert.match(n.persistenciaAviso.textContent,/Pedido salvo neste navegador/);
});

test('cópia Pix confirma junto ao botão somente após clipboard resolver, sem enviar pagamento',async()=>{
 let liberar,copiado;const n=await tela({pagamento:{status:'action_required',pix:{codigo:'000201TESTE'}}},{},{clipboard:{writeText:async valor=>{copiado=valor;await new Promise(r=>liberar=r);}}});
 const copia=n.copiar.click();assert.equal(n.copiar.disabled,true);assert.equal(n.pixCopiaAviso.textContent,'Copiando código…');
 liberar();await copia;assert.equal(copiado,'000201TESTE');assert.equal(n.pixCopiaAviso.textContent,'Código copiado.');assert.equal(n.copiar.textContent,'Copiado!');assert.deepEqual(n.chamadas,['status']);
});

test('clipboard ausente ou negado mantém código e dá instrução local de cópia manual',async()=>{
 for(const clipboard of [undefined,{writeText:async()=>{throw Error('NotAllowedError');}}]){
  const n=await tela({pagamento:{status:'action_required',pix:{codigo:'000201TESTE'}}},{},{clipboard});await n.copiar.click();
  assert.match(n.pixCopiaAviso.textContent,/não permitiu copiar/);assert.doesNotMatch(n.pixCopiaAviso.textContent,/Código copiado\./);assert.equal(n.pixCodigo.value,'000201TESTE');assert.equal(n.copiar.disabled,false);assert.deepEqual(n.chamadas,['status']);
 }
});

test('novo carrinho após pedido pago, recusado ou sem cobrança consulta antes e não prepara nem paga',async()=>{
 const recibos={heeeph_pedido_recuperavel:JSON.stringify({id:base.id,token:'b'.repeat(64),guardadoEm:Date.now()})};
 for(const pagamento of [null,{status:'processed',aprovado:true},{status:'failed',trocaPermitida:true}]){
  const n=await tela({expirado:true,pagamento},{heeeph_pedido_teste:null},{recibos});
  assert.equal(n.novoCarrinho.hidden,false);await n.novoCarrinho.click();
  assert.equal(n.entrega.hidden,false);assert.equal(n.conferir.disabled,false);assert.equal(n.meios.hidden,true);
  assert.deepEqual(n.chamadas,['configuracao','status','cep']);assert.match(n.pedidoResumo.textContent,/anterior preservado/);
  assert.equal(JSON.parse(n.recibos.heeeph_pedido_recuperavel).id,base.id);
 }
});

test('novo carrinho com pagamento pendente ou tentativa incerta retoma original sem liberar outra compra',async()=>{
 const recibos={heeeph_pedido_recuperavel:JSON.stringify({id:base.id,token:'b'.repeat(64),guardadoEm:Date.now()})};
 for(const resposta of [{tentativa:true},{pagamento:{status:'action_required'}},{pagamento:{status:'processing'}}]){
  const n=await tela(resposta,{heeeph_pedido_teste:null},{recibos});await n.novoCarrinho.click();
  assert.equal(n.entrega.hidden,true);assert.deepEqual(n.chamadas,['configuracao','status']);assert.match(n.mensagem.textContent,/outra compra não foi preparada/);assert.match(n.pedidoResumo.textContent,new RegExp(base.id));
 }
});
test('pedido restaurado sem tentativa volta aos meios e recupera public key',async()=>{const n=await tela({});assert.equal(n.meios.hidden,false);assert.equal(n.resultado.hidden,true);assert.match(n.mensagem.textContent,/Escolha como pagar/);});
test('tentativa incerta mostra consulta e recuperação Pix, sem mensagem enganosa',async()=>{const n=await tela({tentativa:true,recuperarPix:true});assert.equal(n.meios.hidden,true);assert.equal(n.resultado.hidden,false);assert.equal(n.recuperarPix.hidden,false);assert.doesNotMatch(n.mensagem.textContent,/Escolha como pagar/);});
test('recusa explícita mostra erro e permite corrigir pagamento',async()=>{const n=await tela({ultimaFalha:{mensagem:'Confira os dados.'}});assert.equal(n.meios.hidden,false);assert.equal(n.mensagem.dataset.tipo,'erro');assert.equal(n.mensagem.textContent,'Confira os dados.');});

test('recusa confirmada oferece revisão, mas pendência e aprovação não liberam outra compra',async()=>{
 const n=await tela({pagamento:{status:'failed',trocaPermitida:true}});assert.equal(n.trocarPagamento.hidden,false);assert.match(n.statusTexto.textContent,/recusado/);
 for(const pg of [{status:'processing'},{status:'action_required'},{status:'processed',aprovado:true}])assert.equal((await tela({pagamento:pg})).trocarPagamento.hidden,true);
 assert.equal((await tela({tentativa:true})).trocarPagamento.hidden,true);
});

test('revisão liberada volta aos dados sem chamar pagar nem preparar',async()=>{
 const checkout={cep:'01001000',itens:[{id:'x'}],frete:10,servico:'1'};
 const n=await tela({pagamento:{status:'failed',trocaPermitida:true},checkout});
 await n.trocarPagamento.click();assert.equal(n.entrega.hidden,false);assert.equal(n.meios.hidden,true);assert.equal(n.resultado.hidden,true);assert.match(n.mensagem.textContent,/Nenhum pagamento foi iniciado/);
 assert.equal(n.conferir.disabled,false);assert.deepEqual(n.chamadas,['status','liberarNovaCompra']);
});
test('falha na configuração bloqueia preparação sem carrinho carregado',async()=>{
 const n=await tela({mensagem:'Origem não autorizada.'},{heeeph_pedido_teste:null},{falhar:true});
 assert.equal(n.conferir.disabled,true);await n.entrega.submit({preventDefault(){}});
 assert.deepEqual(n.chamadas,['configuracao']);assert.match(n.mensagem.textContent,/Volte ao carrinho/);
});

test('CEP preenche somente campos vazios e preserva nome, número e endereço já digitado',async()=>{
 const n=await tela({}, {heeeph_pedido_teste:null},{campos:{nome:'Comprador Teste',numero:'42',rua:'Rua já preenchida',complemento:'Apto 3'}});
 const f=n.entrega.elements;assert.equal(f.rua.value,'Rua já preenchida');assert.equal(f.numero.value,'42');assert.equal(f.complemento.value,'Apto 3');assert.equal(f.nome.value,'Comprador Teste');assert.equal(f.cidade.value,'São Paulo');assert.equal(f.uf.value,'SP');assert.deepEqual(n.chamadas,['configuracao','cep']);
});

test('divergência de endereço é mostrada antes de preparar pedido, sem limpar os dados',async()=>{
 const n=await tela({}, {heeeph_pedido_teste:null},{campos:{nome:'Comprador Teste',numero:'42',cidade:'Outra Cidade'}});
 await n.entrega.submit({preventDefault(){},target:n.entrega});
 assert.deepEqual(n.chamadas,['configuracao','cep']);assert.match(n.mensagem.textContent,/cidade não corresponde/);assert.equal(n.entrega.elements.cidade.value,'Outra Cidade');assert.equal(n.entrega.elements.numero.value,'42');assert.equal(n.conferir.disabled,false);
});

test('indisponibilidade do CEP mantém formulário e permite repetir apenas a consulta',async()=>{
 const n=await tela({}, {heeeph_pedido_teste:null},{cepFalha:true,campos:{nome:'Comprador Teste',rua:'Rua digitada',numero:'42'}});
 await n.entrega.submit({preventDefault(){},target:n.entrega});
 assert.deepEqual(n.chamadas,['configuracao','cep','cep']);assert.equal(n.entrega.elements.rua.value,'Rua digitada');assert.equal(n.entrega.elements.nome.value,'Comprador Teste');assert.equal(n.conferir.disabled,false);assert.match(n.mensagem.textContent,/preservados/);
});
test('botão próprio valida pelo Brick antes de um único envio e bloqueia cliques simultâneos',async()=>{
 let configuracao,liberar;const sequencia=[];
 function sdk(){return {bricks:()=>({create:async(_,__,config)=>{configuracao=config;config.callbacks.onReady();return {getFormData:async()=>{sequencia.push('form');await new Promise(r=>liberar=r);return {token:'token-simulado'};},getAdditionalData:async()=>{sequencia.push('adicional');return {paymentTypeId:'credit_card'};}};}})};}
 const n=await tela({}, {},{sdk});await n.cartao.click();assert.equal(configuracao.customization.visual.hidePaymentButton,true);assert.equal(n.confirmarCartao.hidden,false);
 const primeira=n.confirmarCartao.click();await n.confirmarCartao.click();assert.equal(n.pix.disabled,true);assert.deepEqual(n.chamadas,['status']);liberar();await primeira;
 assert.deepEqual(sequencia,['form','adicional']);assert.deepEqual(n.chamadas,['status','pagar']);assert.equal(n.confirmarCartao.disabled,false);
});
test('validação incompleta do Brick dá retorno visível sem chamar pagar',async()=>{
 function sdk(){return {bricks:()=>({create:async(_,__,config)=>{config.callbacks.onReady();return {getFormData:async()=>{throw {cause:'incomplete_fields'};}};}})};}
 const n=await tela({}, {},{sdk});await n.cartao.click();await n.confirmarCartao.click();assert.deepEqual(n.chamadas,['status']);assert.match(n.mensagem.textContent,/todos os campos/);assert.equal(n.pix.disabled,false);
});
test('retorno envelopado do SDK conserva token e tipo sem repetir coleta ou pagamento',async()=>{
 function sdk(){return {bricks:()=>({create:async(_,__,config)=>{config.callbacks.onReady();return {getFormData:async()=>({formData:{token:'token-simulado'},additionalData:{paymentTypeId:'credit_card'}}),getAdditionalData(){throw Error('Não deve recolher o que o SDK já retornou');}};}})};}
 const n=await tela({}, {},{sdk});await n.cartao.click();await n.confirmarCartao.click();assert.deepEqual(n.chamadas,['status','pagar']);
});

test('SDK que resolve null informa falha e permite reabrir sem enviar pagamento',async()=>{
 let tentativas=0,liberar;
 function sdk(){return {bricks:()=>({create:()=>{tentativas++;return new Promise(r=>liberar=r);}})};}
 const n=await tela({}, {},{sdk});const abertura=n.cartao.click();await n.cartao.click();
 assert.equal(tentativas,1);assert.equal(n.pix.disabled,true);assert.match(n.mensagem.textContent,/Carregando/);
 liberar(null);await abertura;assert.match(n.mensagem.textContent,/Nenhum pagamento foi enviado/);
 assert.equal(n.cartao.disabled,false);assert.equal(n.pix.disabled,false);assert.equal(n.confirmarCartao.hidden,true);
 assert.deepEqual(n.chamadas,['status']);
 const segunda=n.cartao.click();assert.equal(tentativas,2);liberar(null);await segunda;
});
test('falha na configuração pública do SDK não cria Brick nem envia pagamento',async()=>{
 function sdk(){return {getIdentificationTypes:async()=>{throw {status:401};},bricks(){throw Error('Não deveria criar');}};}
 const n=await tela({}, {},{sdk});await n.cartao.click();assert.match(n.mensagem.textContent,/configuração do cartão/);assert.deepEqual(n.chamadas,['status']);assert.equal(n.cartao.disabled,false);
});
test('consulta informa atualização mesmo quando o pagamento já estava aprovado',async()=>{const n=await tela({pagamento:{aprovado:true,status:'processed'}});await n.consultar.click();assert.match(n.mensagem.textContent,/Consulta atualizada/);assert.match(n.mensagem.textContent,/aprovado/);assert.equal(n.consultar.disabled,false);});
test('3DS retoma desafio do mesmo pedido e somente mensagem da origem e iframe corretos consulta status',async()=>{
 const url='https://www.mercadopago.com.br/auth/card/validation/pages/remedies/fixture?guest_token=ficticio';
 const n=await tela({pagamento:{status:'action_required',detalhe:'pending_challenge',autenticacao:{necessaria:true,url}}});
 assert.equal(n.autenticacaoCartao.hidden,false);assert.equal(n.desafio3ds.src,url);assert.equal(n.trocarPagamento.hidden,true);
 for(const e of [{origin:'https://atacante.test',source:n.desafio3ds.contentWindow,data:{status:'COMPLETE'}},{origin:'https://www.mercadopago.com.br',source:{},data:{status:'COMPLETE'}}])await n.eventos.message(e);
 assert.deepEqual(n.chamadas,['status']);
 await n.eventos.message({origin:'https://www.mercadopago.com.br',source:n.desafio3ds.contentWindow,data:{status:'COMPLETE'}});
 assert.deepEqual(n.chamadas,['status','status']);assert.doesNotMatch(n.statusTitulo.textContent,/aprovado/);
});
test('URL 3DS externa não é incorporada e pagamento aprovado remove desafio antigo',async()=>{
 const n=await tela({pagamento:{status:'action_required',autenticacao:{necessaria:true,url:'https://atacante.test'}}});assert.equal(n.desafio3ds.hidden,true);assert.equal(n.desafio3ds.src,undefined);assert.match(n.autenticacaoTexto.textContent,/não pôde ser exibida/);
 const p=await tela({pagamento:{status:'processed',aprovado:true,autenticacao:{necessaria:true,url:'https://www.mercadopago.com.br/auth/card/validation/pages/remedies/fixture'}}});assert.equal(p.autenticacaoCartao.hidden,true);assert.equal(p.desafio3ds.src,undefined);
});

test('recupera pedido mesmo sem carrinho salvo e sempre mostra seu número',async()=>{
 const n=await tela({pagamento:{aprovado:true,status:'processed'}},{heeeph_checkout:null});
 assert.equal(n.resultado.hidden,false);assert.match(n.pedidoResumo.textContent,new RegExp(base.id));assert.doesNotMatch(n.mensagem.textContent,/Volte ao carrinho/);
});
test('recupera preparação interrompida antes de preencher outro formulário',async()=>{
 const n=await tela({token:'b'.repeat(64)},{heeeph_pedido_teste:null,heeeph_checkout:null,heeeph_preparacao:JSON.stringify({acao:'preparar',chavePreparacao:'c'.repeat(64)})});
 assert.equal(n.meios.hidden,false);assert.equal(n.entrega.hidden,true);assert.match(n.pedidoResumo.textContent,new RegExp(base.id));
});
test('produção não informa ao comprador que um pedido aprovado é simulação',async()=>{
 const n=await tela({teste:false,pagamento:{aprovado:true,status:'processed'}});
 assert.equal(n.statusTitulo.textContent,'Pagamento aprovado');assert.doesNotMatch(n.statusTexto.textContent,/teste/);assert.doesNotMatch(n.avisoAmbiente.textContent,/teste/);
});

test('Pix restaurado gera QR local a partir do copia e cola quando a imagem do provedor está vazia',async()=>{
 const codigo='00020126580014br.gov.bcb.pix0136b76aa9c2-2ec4-4110-954e-ebfe34f05b615204000053039865406200.005802BR5918TESTUSER20543760926009Sao Paulo62250521mpqrinter1046697480436304B70B';
 const n=await tela({pagamento:{status:'action_required',pix:{codigo,imagem:''}}});
 assert.equal(n.pixCodigo.value,codigo);assert.equal(n.qr.hidden,false);assert.match(n.qr.src,/^data:image\/gif;base64,/);assert.equal(n.copiar.disabled,false);
 const bytes=Buffer.from(n.qr.src.split(',')[1],'base64');assert.equal(bytes.subarray(0,6).toString(),'GIF87a');assert.ok(bytes.readUInt16LE(6)>200);
});
test('Pix sem código informa ausência e mantém cópia e imagem indisponíveis',async()=>{
 const n=await tela({pagamento:{status:'action_required',pix:{codigo:'',imagem:''}}});
 assert.equal(n.qr.hidden,true);assert.equal(n.copiar.disabled,true);assert.match(n.mensagem.textContent,/não retornou os dados/);
});

test('Pix aprovado não mostra código vazio nem aviso para aguardar ou pagar outra vez',async()=>{
 for(const pix of [{codigo:'',imagem:''},{codigo:'000201TESTE',imagem:''}]){
  const n=await tela({pagamento:{aprovado:true,status:'processed',pix}});
  assert.equal(n.pixResultado.hidden,true);assert.equal(n.qr.hidden,true);assert.equal(n.copiar.disabled,true);assert.equal(n.pixCodigo.value,'');
  assert.equal(n.statusTitulo.textContent,'Pagamento de teste aprovado');assert.equal(n.mensagem.textContent,'');
 }
});
test('imagem Pix do provedor com erro usa o mesmo copia e cola para gerar QR',async()=>{
 const n=await tela({pagamento:{status:'action_required',pix:{codigo:'000201TESTE',imagem:'AAAA'}}});
 n.qr.onerror();assert.match(n.qr.src,/^data:image\/gif;base64,/);assert.equal(n.qr.hidden,false);
});
