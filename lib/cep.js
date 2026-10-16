const {divergencia}=require('../js/enderecos');
class ErroCEP extends Error{constructor(message,status=422,campo){super(message);this.status=status;this.campo=campo;}}
const cache=new Map();
async function consultarCEP(cep){
  if(typeof cep!=='string'||!/^\d{8}$/.test(cep))throw new ErroCEP('Confira o CEP: use 8 números.',400);
  const anterior=cache.get(cep);
  if(anterior?.ate>Date.now())return {...anterior.endereco};
  let d;
  try{
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error('consulta indisponível');
    d=await r.json();
  }catch{throw new ErroCEP('Não foi possível conferir o CEP agora. Seus dados foram preservados; tente novamente.',503);}
  if(d?.erro===true||d?.erro==='true')throw new ErroCEP('CEP não encontrado. Volte ao carrinho para corrigir o CEP.');
  const texto=v=>typeof v==='string'&&v.length<=150&&!/[\x00-\x1f<>]/.test(v)?v.trim():null;
  const endereco={cep:String(d?.cep||'').replace(/\D/g,''),rua:texto(d?.logradouro),bairro:texto(d?.bairro),cidade:texto(d?.localidade),uf:texto(d?.uf)};
  if(endereco.cep!==cep||endereco.rua===null||endereco.bairro===null||!endereco.cidade||!['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(endereco.uf))
    throw new ErroCEP('O serviço de CEP retornou dados incompletos. Seus dados foram preservados; tente novamente.',503);
  if(cache.size>=256)cache.delete(cache.keys().next().value);
  cache.set(cep,{ate:Date.now()+10*60000,endereco});
  return {...endereco};
}
async function validarEndereco(cep,endereco){
  const referencia=await consultarCEP(cep);
  const erro=divergencia(endereco,referencia);
  if(erro)throw new ErroCEP(erro.mensagem,422,erro.campo);
  return referencia;
}
module.exports={consultarCEP,validarEndereco,ErroCEP};
