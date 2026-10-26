(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const categorias={bandas:'Bandas',bebidas:'Bebidas',games:'Games',garage:'Garage',infantil:'Infantil',motos:'Motos',musica:'Música',rpg:'RPG',street:'Street',trip:'Trip'};
 const estado={produtos:[],imagem:null,id:null,aberto:false};
 const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
 function mensagem(texto,erro=false){const n=$('cadastro-mensagem');n.textContent=texto;n.dataset.tipo=erro?'erro':'info';}
 async function api(body){
  const r=await fetch('/api/catalogo',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+$('chave').value},body:JSON.stringify(body),cache:'no-store'});
  const d=await r.json();if(!r.ok)throw Error(d.mensagem||'Falha no cadastro.');return d;
 }
 function limpar(){
  $('form-placa').reset();estado.id=null;estado.imagem=null;$('placa-id').textContent='Nova placa';
  $('placa-preview').hidden=true;$('placa-preview').removeAttribute('src');
  $('placa-ativo').checked=true;$('placa-salvar').textContent='Salvar placa';
 }
 async function converterImagem(file){
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Selecione PNG, JPG ou WebP com até 12 MB.');
  const bitmap=await createImageBitmap(file);
  try{
   const max=850,escala=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*escala));canvas.height=Math.max(1,Math.round(bitmap.height*escala));
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
   let data=canvas.toDataURL('image/webp',.78);
   if(data.length>310000)data=canvas.toDataURL('image/webp',.48);
   if(!data.startsWith('data:image/webp;base64,')||data.length>310000)throw Error('Imagem muito grande para a prévia. Reduza a arte e tente novamente.');
   return data;
  }finally{bitmap.close();}
 }
 function render(){
  const lista=$('lista-placas');lista.replaceChildren();
  $('total-placas').textContent=estado.produtos.length+' placa(s) cadastrada(s) neste ambiente de teste.';
  if(!estado.produtos.length){lista.append(el('p','Nenhuma placa cadastrada pelo painel ainda.'));return;}
  for(const p of estado.produtos){
   const card=el('article');card.className='admin-card admin-placa';
   const imagem=el('img');imagem.loading='lazy';imagem.alt='Miniatura de '+p.nome;imagem.src='/api/catalogo?imagem='+encodeURIComponent(p.id);
   const detalhes=el('div');detalhes.append(el('h3',p.nome),el('p',(categorias[p.categoria]||p.categoria)+' · '+(p.orientacao==='vertical'?'Vertical':'Horizontal')+' · '+(p.ativo?'Disponível':'Oculta')));
   if(p.descricao)detalhes.append(el('p',p.descricao));
   const acoes=el('div');acoes.className='admin-acoes';
   const editar=el('button','Editar');editar.type='button';editar.addEventListener('click',()=>editarPlaca(p));
   const alternar=el('button',p.ativo?'Ocultar':'Disponibilizar');alternar.type='button';alternar.addEventListener('click',async()=>{
    alternar.disabled=true;
    try{await api({acao:'salvar',id:p.id,produto:{...p,ativo:!p.ativo}});await carregar();mensagem('Disponibilidade atualizada.');}
    catch(e){mensagem(e.message,true);}finally{alternar.disabled=false;}
   });
   const excluir=el('button','Excluir');excluir.type='button';excluir.addEventListener('click',async()=>{
    if(!confirm('Excluir definitivamente a placa de teste "'+p.nome+'"?'))return;
    excluir.disabled=true;
    try{await api({acao:'excluir',id:p.id,confirmacao:p.id});await carregar();limpar();mensagem('Placa excluída do catálogo de teste.');}
    catch(e){mensagem(e.message,true);}finally{excluir.disabled=false;}
   });
   acoes.append(editar,alternar,excluir);detalhes.append(acoes);card.append(imagem,detalhes);lista.append(card);
  }
 }
 function editarPlaca(p){
  estado.id=p.id;estado.imagem=null;
  $('placa-id').textContent='Editando: '+p.nome;
  $('placa-nome').value=p.nome;$('placa-categoria').value=p.categoria;
  $('placa-orientacao').value=p.orientacao;$('placa-descricao').value=p.descricao||'';
  $('placa-ativo').checked=p.ativo;
  $('placa-imagem').value='';
  $('placa-preview').src='/api/catalogo?imagem='+encodeURIComponent(p.id);$('placa-preview').hidden=!p.ativo;
  $('placa-salvar').textContent='Salvar alterações';
  $('form-placa').scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function carregar(){
  const d=await api({acao:'listar'});estado.produtos=d.produtos||[];render();
 }
 $('placa-novo').addEventListener('click',()=>{limpar();$('placa-nome').focus();});
 $('placa-imagem').addEventListener('change',async e=>{
  estado.imagem=null;const file=e.target.files?.[0];if(!file)return;
  try{mensagem('Preparando miniatura da imagem…');estado.imagem=await converterImagem(file);$('placa-preview').src=estado.imagem;$('placa-preview').hidden=false;mensagem('Imagem pronta. A loja usa uma miniatura WebP; guarde a arte original para impressão.');}
  catch(err){$('placa-imagem').value='';mensagem(err.message,true);}
 });
 $('form-placa').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('placa-salvar');btn.disabled=true;
  try{
   const produto={nome:$('placa-nome').value,categoria:$('placa-categoria').value,orientacao:$('placa-orientacao').value,descricao:$('placa-descricao').value,ativo:$('placa-ativo').checked};
   await api({acao:'salvar',id:estado.id||undefined,produto,imagem:estado.imagem});
   limpar();await carregar();mensagem('Placa salva no catálogo do Preview. Confira na categoria da loja de teste.');
  }catch(err){mensagem(err.message,true);}finally{btn.disabled=false;}
 });
 document.addEventListener('heeeph:autenticado',async()=>{
  $('cadastro-placas').hidden=false;
  try{await carregar();mensagem('Cadastro de placas pronto para usar no Preview.');}
  catch(e){mensagem(e.message,true);}
 });
 document.addEventListener('heeeph:sair',()=>{estado.produtos=[];limpar();$('lista-placas').replaceChildren();$('cadastro-placas').hidden=true;mensagem('');});
})();
