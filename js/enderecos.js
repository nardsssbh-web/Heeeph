(function(root){
  'use strict';
  function normalizar(valor){
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')
      .replace(/^(r|av|pca|pc|rod|tv|al) /,(_,tipo)=>({r:'rua',av:'avenida',pca:'praca',pc:'praca',rod:'rodovia',tv:'travessa',al:'alameda'}[tipo]+' '));
  }
  function divergencia(endereco,referencia){
    const nomes={rua:'A rua',bairro:'O bairro',cidade:'A cidade',uf:'A UF'};
    for(const campo of ['uf','cidade','rua','bairro']){
      // CEPs gerais/rurais podem não informar logradouro ou bairro.
      if(referencia[campo] && normalizar(endereco[campo])!==normalizar(referencia[campo]))
        return {campo,mensagem:`${nomes[campo]} não corresponde ao CEP. Confira: ${referencia[campo]}. Se o CEP estiver incorreto, volte ao carrinho para alterá-lo.`};
    }
    return null;
  }
  const api={normalizar,divergencia};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EnderecosHEEEPH=api;
})(typeof globalThis!=='undefined'?globalThis:this);
