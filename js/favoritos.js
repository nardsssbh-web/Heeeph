/* Contas e favoritas: Supabase Auth + RLS. Nenhum dado pessoal em localStorage próprio. */
(function(){
  "use strict";
  let cliente=null, usuario=null, favoritos=new Set();
  const paginaConta=!!document.getElementById("contaConteudo");
  const estado=()=>document.getElementById("contaEstado");
  const msg=(s)=>{if(estado())estado().textContent=s;};
  const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function adicionarLink(){
    const menu=document.querySelector(".menu");
    if(menu&&!menu.querySelector(".heeeph-conta-link")){
      const a=document.createElement("a");a.href="minha-heeeph.html";a.className="heeeph-conta-link";a.textContent="⭐ MINHA HEEEPH";menu.append(a);
    }
  }
  function atualizarEstrelas(){
    document.querySelectorAll("[data-favorito-id]").forEach(b=>{
      const ativo=favoritos.has(b.dataset.favoritoId);
      b.setAttribute("aria-pressed",String(ativo));
      b.textContent=ativo?"★":"☆";
      b.setAttribute("aria-label",ativo?"Remover dos favoritos":"Adicionar aos favoritos");
    });
  }
  function instalarEstrelas(){
    if(!document.getElementById("gradePlacas"))return;
    document.querySelectorAll(".item-placa[id^='produto-']").forEach(card=>{
      if(card.querySelector("[data-favorito-id]"))return;
      const id=card.id.slice(8);
      const btn=document.createElement("button");
      btn.type="button";btn.className="favorito-estrela";btn.dataset.favoritoId=id;
      btn.setAttribute("aria-label","Adicionar ou remover dos favoritos");
      btn.addEventListener("click",()=>alternar(id,btn));
      const imagem=card.querySelector(".img-box");
      if(imagem){imagem.classList.add("favorito-imagem-wrap");imagem.append(btn);}else{card.append(btn);}
    });
    atualizarEstrelas();
  }
  async function buscar(){
    if(!cliente||!usuario)return;
    const {data,error}=await cliente.from("favoritos").select("produto_id").eq("user_id",usuario.id);
    if(error)throw error;
    favoritos=new Set((data||[]).map(x=>x.produto_id));
    atualizarEstrelas();
  }
  async function alternar(id,btn){
    if(!cliente){alert("Favoritas indisponíveis enquanto o cadastro não estiver configurado.");return;}
    if(!usuario){window.location.href="minha-heeeph.html?retorno="+encodeURIComponent(location.pathname.split("/").pop());return;}
    btn.disabled=true;
    try{
      const ativo=favoritos.has(id);
      const query=ativo?cliente.from("favoritos").delete().eq("user_id",usuario.id).eq("produto_id",id):cliente.from("favoritos").insert({user_id:usuario.id,produto_id:id});
      const {error}=await query;if(error)throw error;
      if(ativo)favoritos.delete(id);else favoritos.add(id);
      atualizarEstrelas();
      if(paginaConta)mostrarConta();
    }catch(e){alert("Não foi possível atualizar suas favoritas. Tente novamente.");}
    finally{btn.disabled=false;}
  }
  function catalogo(){
    const mapa=new Map();
    if(typeof PRODUTOS!=="undefined")Object.entries(PRODUTOS).forEach(([categoria,produtos])=>{
      if(Array.isArray(produtos))produtos.forEach(p=>mapa.set(p.id,{...p,categoria}));
    });
    return mapa;
  }
  function mostrarConta(){
    const el=document.getElementById("contaConteudo");if(!el)return;
    if(!cliente){el.innerHTML="<p>O cadastro ainda não foi configurado. Nenhuma conta pode ser criada por enquanto.</p>";return;}
    if(!usuario){
      el.innerHTML='<form id="formEmail"><label for="emailConta">Seu e-mail</label><input id="emailConta" type="email" autocomplete="email" required maxlength="254" placeholder="voce@exemplo.com"><button type="submit">Enviar link de acesso</button></form><p>Você receberá um link para entrar na sua conta. Não precisa de senha nem código.</p>';
      document.getElementById("formEmail").addEventListener("submit",async e=>{
        e.preventDefault();
        const b=e.currentTarget.querySelector("button");
        b.disabled=true;
        try{
          const email=document.getElementById("emailConta").value.trim();
          const {error}=await cliente.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+"/minha-heeeph.html"}});
          if(error)throw error;
          msg("Link enviado! Abra o e-mail e clique em Confirmar acesso. Confira também o spam.");
        }catch(e){
          msg("Não foi possível enviar o link agora. Aguarde um pouco e tente novamente.");
        }finally{b.disabled=false;}
      });
      return;
    }
    const mapa=catalogo();
    const cards=[...favoritos].map(id=>{
      const p=mapa.get(id);if(!p)return "";
      const url=p.categoria+".html?produto="+encodeURIComponent(id);
      return '<article class="favoritos-item"><img src="'+esc(p.imagem)+'" alt="'+esc(p.nome)+'" loading="lazy"><strong>'+esc(p.nome)+'</strong><a href="'+esc(url)+'">Ver placa</a><button type="button" data-remover="'+esc(id)+'">Remover ★</button></article>';
    }).join("");
    el.innerHTML='<p>Conectado como <strong>'+esc(usuario.email)+'</strong> · <button type="button" id="sairConta">Sair</button></p><h2>Minhas favoritas ('+favoritos.size+')</h2>'+(cards?'<div class="favoritos-grade">'+cards+'</div>':'<p>Você ainda não salvou placas. <a href="categorias.html">Explorar coleções</a></p>');
    el.querySelector("#sairConta").addEventListener("click",async()=>{await cliente.auth.signOut();});
    el.querySelectorAll("[data-remover]").forEach(b=>b.addEventListener("click",()=>alternar(b.dataset.remover,b)));
  }
  async function iniciar(){
    adicionarLink();instalarEstrelas();
    try{
      const resposta=await fetch("/api/auth-config",{cache:"no-store"});
      if(!resposta.ok)throw new Error("Não configurado");
      const conf=await resposta.json();
      if(!conf.configured||!window.supabase)throw new Error("Não configurado");
      cliente=window.supabase.createClient(conf.url,conf.key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
      const {data:{session},error:sessionError}=await cliente.auth.getSession();
      if(sessionError)throw sessionError;
      usuario=session?.user||null;
      if(usuario)await buscar();
      cliente.auth.onAuthStateChange((_event,session)=>{
        const novo=session?.user||null;
        if(novo?.id!==usuario?.id){usuario=novo;favoritos.clear();atualizarEstrelas();mostrarConta();if(usuario)buscar().then(mostrarConta).catch(()=>msg("Erro ao carregar favoritas."));}
      });
      mostrarConta();
    }catch(e){mostrarConta();msg("Não foi possível conectar a conta neste endereço. Abra a versão atualizada da HEEEPH.");}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar);else iniciar();
})();
