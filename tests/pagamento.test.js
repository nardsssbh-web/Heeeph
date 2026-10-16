const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const base={id:'a'.repeat(32),teste:true,itens:[],pacotes:[],subtotal:0,frete:{centavos:0,servico:'PAC',transportadora:'Correios'},total:100,publicKey:'publica',pagamento:null,tentativa:false};
async function tela(resposta,armazenamento={}){
 const nodes={},chamadas=[];const el=()=>({hidden:false,disabled:false,textContent:'',dataset:{},elements:{uf:{append(){}}},querySelectorAll:()=>[],addEventListener(n,fn){this[n]=fn;},replaceChildren(){},append(){},setAttribute(){},removeAttribute(n){delete this[n];},scrollIntoView(){}});
 for(const id of ['entrega','mensagem','resumo','total','meios','resultado','pedidoNumero','statusTitulo','statusTexto','pixResultado','pixCodigo','qr','pix','cartao','conferir','consultar','copiar','cep','recuperarPix','pedidoResumo','avisoAmbiente','meiosTitulo','meiosTexto','envioAviso','trocarPagamento'])nodes[id]=el();
 const values={heeeph_checkout:JSON.stringify({cep:'01001000',itens:[{id:'x'}]}),heeeph_pedido_teste:JSON.stringify({id:base.id,token:'b'.repeat(64)})};
 Object.assign(values,armazenamento);
 const ctx=vm.createContext({console,qrcode:require('../js/vendor/qrcode-generator-1.4.4'),fetch:async(url,opts)=>{chamadas.push(JSON.parse(opts.body).acao);return {ok:true,json:async()=>({...base,...resposta})};},document:{getElementById:id=>nodes[id],createElement:el},window:{addEventListener(){}},navigator:{},sessionStorage:{getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v,removeItem:k=>delete values[k]}});
 vm.runInContext(fs.readFileSync('js/pagamento.js','utf8'),ctx);await new Promise(setImmediate);nodes.chamadas=chamadas;return nodes;
}
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
 assert.deepEqual(n.chamadas,['status','liberarNovaCompra']);
});

test('consulta informa atualização mesmo quando o pagamento já estava aprovado',async()=>{const n=await tela({pagamento:{aprovado:true,status:'processed'}});await n.consultar.click();assert.match(n.mensagem.textContent,/Consulta atualizada/);assert.match(n.mensagem.textContent,/aprovado/);assert.equal(n.consultar.disabled,false);});

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
test('imagem Pix do provedor com erro usa o mesmo copia e cola para gerar QR',async()=>{
 const n=await tela({pagamento:{status:'action_required',pix:{codigo:'000201TESTE',imagem:'AAAA'}}});
 n.qr.onerror();assert.match(n.qr.src,/^data:image\/gif;base64,/);assert.equal(n.qr.hidden,false);
});
