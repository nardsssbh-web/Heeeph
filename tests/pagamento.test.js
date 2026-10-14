const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const base={id:'a'.repeat(32),teste:true,itens:[],pacotes:[],subtotal:0,frete:{centavos:0,servico:'PAC',transportadora:'Correios'},total:100,publicKey:'publica',pagamento:null,tentativa:false};
async function tela(resposta){
 const nodes={};const el=()=>({hidden:false,disabled:false,textContent:'',dataset:{},elements:{uf:{append(){}}},querySelectorAll:()=>[],addEventListener(n,fn){this[n]=fn;},replaceChildren(){},append(){},setAttribute(){},scrollIntoView(){}});
 for(const id of ['entrega','mensagem','resumo','total','meios','resultado','pedidoNumero','statusTitulo','statusTexto','pixResultado','pixCodigo','qr','pix','cartao','conferir','consultar','copiar','cep','recuperarPix'])nodes[id]=el();
 const values={heeeph_checkout:JSON.stringify({cep:'01001000',itens:[{id:'x'}]}),heeeph_pedido_teste:JSON.stringify({id:base.id,token:'b'.repeat(64)})};
 const ctx=vm.createContext({console,fetch:async()=>({ok:true,json:async()=>({...base,...resposta})}),document:{getElementById:id=>nodes[id],createElement:el},window:{addEventListener(){}},navigator:{},sessionStorage:{getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v,removeItem:k=>delete values[k]}});
 vm.runInContext(fs.readFileSync('js/pagamento.js','utf8'),ctx);await new Promise(setImmediate);return nodes;
}
test('pedido restaurado sem tentativa volta aos meios e recupera public key',async()=>{const n=await tela({});assert.equal(n.meios.hidden,false);assert.equal(n.resultado.hidden,true);assert.match(n.mensagem.textContent,/Escolha como pagar/);});
test('tentativa incerta mostra consulta e recuperação Pix, sem mensagem enganosa',async()=>{const n=await tela({tentativa:true,recuperarPix:true});assert.equal(n.meios.hidden,true);assert.equal(n.resultado.hidden,false);assert.equal(n.recuperarPix.hidden,false);assert.doesNotMatch(n.mensagem.textContent,/Escolha como pagar/);});
test('recusa explícita mostra erro e permite corrigir pagamento',async()=>{const n=await tela({ultimaFalha:{mensagem:'Confira os dados.'}});assert.equal(n.meios.hidden,false);assert.equal(n.mensagem.dataset.tipo,'erro');assert.equal(n.mensagem.textContent,'Confira os dados.');});
