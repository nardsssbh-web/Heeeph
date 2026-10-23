/* Favoritas HEEEPH: somente neste navegador, sem cadastro ou serviços externos. */
(function () {
  "use strict";
  const CHAVE = "heeeph_favoritos_v1";
  const paginaConta = !!document.getElementById("contaConteudo");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function ler() {
    try {
      const valor = JSON.parse(localStorage.getItem(CHAVE) || "[]");
      return new Set(Array.isArray(valor) ? valor.filter(x => typeof x === "string") : []);
    } catch (_) { return new Set(); }
  }
  let favoritos = ler();
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify([...favoritos])); return true; }
    catch (_) { alert("Não foi possível salvar neste navegador. Verifique se o armazenamento está permitido."); return false; }
  }
  function linkMenu() {
    const menu = document.querySelector(".menu");
    if (menu && !menu.querySelector(".heeeph-conta-link")) {
      const a = document.createElement("a");
      a.href = "minha-heeeph.html";
      a.className = "heeeph-conta-link";
      a.innerHTML = '<span class="heeeph-estrela-menu" aria-hidden="true">★<span class="heeeph-contador-favoritas"></span></span><span>MINHA HEEEPH</span>';
      menu.append(a);
    }
  }
  function atualizarContador() {
    document.querySelectorAll(".heeeph-contador-favoritas").forEach(el => {
      el.textContent = String(favoritos.size);
      el.hidden = favoritos.size === 0;
    });
    document.querySelectorAll(".heeeph-conta-link").forEach(a => a.setAttribute("aria-label", "Minha HEEEPH: " + favoritos.size + " placas favoritas"));
  }
  function atualizarEstrelas() {
    atualizarContador();
    document.querySelectorAll("[data-favorito-id]").forEach(b => {
      const ativo = favoritos.has(b.dataset.favoritoId);
      b.setAttribute("aria-pressed", String(ativo));
      b.textContent = ativo ? "★" : "☆";
      b.setAttribute("aria-label", ativo ? "Remover dos favoritos" : "Adicionar aos favoritos");
    });
  }
  function alternar(id) {
    const ativo = favoritos.has(id);
    if (ativo) favoritos.delete(id); else favoritos.add(id);
    if (!salvar()) { if (ativo) favoritos.add(id); else favoritos.delete(id); }
    atualizarEstrelas();
    mostrarConta();
  }
  function indisponivel(p) { return !p || !String(p.imagem || "").trim() || /em breve/i.test(String(p.nome || "")); }
  function instalarEstrelas() {
    document.querySelectorAll(".item-placa[id^='produto-']").forEach(card => {
      if (card.querySelector("[data-favorito-id]")) return;
      const id = card.id.slice("produto-".length);
      const p = catalogo().get(id);
      if (indisponivel(p) || card.querySelector(".placa-indisponivel")) return;
      const foto = card.querySelector(".img-box img");
      if (!foto) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "favorito-estrela";
      btn.dataset.favoritoId = id;
      btn.addEventListener("click", () => alternar(id));
      foto.addEventListener("error", () => btn.remove());
      if (foto.complete && foto.naturalWidth === 0) return;
      const imagem = card.querySelector(".img-box");
      if (imagem) { imagem.classList.add("favorito-imagem-wrap"); imagem.append(btn); }
      else card.append(btn);
    });
    atualizarEstrelas();
  }
  function catalogo() {
    const mapa = new Map();
    if (typeof PRODUTOS !== "undefined") Object.entries(PRODUTOS).forEach(([categoria, produtos]) => {
      if (Array.isArray(produtos)) produtos.forEach(p => mapa.set(p.id, {...p, categoria}));
    });
    return mapa;
  }
  const OPCOES = {
    vertical: [{medida:"10x15cm",preco:12.90},{medida:"20x28cm",preco:24.90}],
    horizontal: [{medida:"15x10cm",preco:12.90},{medida:"28x20cm",preco:24.90}]
  };
  const selecao = new Set();
  function mostrarConta() {
    const el = document.getElementById("contaConteudo");
    if (!el) return;
    const mapa = catalogo();
    const disponiveis = [...favoritos].filter(id => !indisponivel(mapa.get(id)));
    for (const id of [...selecao]) if (!disponiveis.includes(id)) selecao.delete(id);
    const cards = disponiveis.map(id => {
      const p = mapa.get(id);
      const url = p.categoria + ".html?produto=" + encodeURIComponent(id);
      const orientacao = p.orientacao === "horizontal" ? "horizontal" : "vertical";
      return '<article class="favoritos-item">' +
        '<label class="favoritos-selecionar"><input type="checkbox" data-selecionar="' + esc(id) + '"' + (selecao.has(id) ? ' checked' : '') + '> Selecionar para comprar</label>' +
        '<img src="' + esc(p.imagem) + '" alt="' + esc(p.nome) + '" loading="lazy">' +
        '<strong>' + esc(p.nome) + '</strong>' +
        '<fieldset class="favoritos-tamanhos"><legend>Escolha o tamanho</legend>' +
        OPCOES[orientacao].map((o, i) => '<label class="favoritos-opcao"><input type="radio" name="tamanho-' + esc(id) + '" data-tamanho="' + esc(id) + '" value="' + esc(o.medida) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(o.medida) + '<small>' + o.preco.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) + '</small></span></label>').join("") +
        '</fieldset>' +
        '<a href="' + esc(url) + '">Ver placa</a>' +
        '<button type="button" data-remover="' + esc(id) + '">Remover ★</button></article>';
    }).join("");
    el.innerHTML = '<h2>Minhas favoritas (' + disponiveis.length + ')</h2>' +
      (cards ? '<div class="favoritos-acoes"><label><input type="checkbox" id="selecionarTodas"> Selecionar todas</label></div><div class="favoritos-grade">' + cards + '</div><div class="favoritos-compra-rodape"><button type="button" id="comprarFavoritas" disabled>Adicionar selecionadas ao carrinho (0)</button></div>' :
      '<p>Você ainda não salvou placas disponíveis. <a href="categorias.html">Explorar coleções</a></p>') +
      '<p>As favoritas ficam guardadas somente neste navegador. Não é necessário cadastro.</p>';
    el.querySelectorAll("[data-remover]").forEach(b => b.addEventListener("click", () => alternar(b.dataset.remover)));
    const checks = [...el.querySelectorAll("[data-selecionar]")];
    const todas = el.querySelector("#selecionarTodas");
    const comprar = el.querySelector("#comprarFavoritas");
    if (!comprar) return;
    function atualizar() {
      checks.forEach(ch => { if (ch.checked) selecao.add(ch.dataset.selecionar); else selecao.delete(ch.dataset.selecionar); });
      const qtd = checks.filter(ch => ch.checked).length;
      comprar.disabled = qtd === 0;
      comprar.textContent = "Adicionar selecionadas ao carrinho (" + qtd + ")";
      todas.checked = qtd === checks.length;
      todas.indeterminate = qtd > 0 && qtd < checks.length;
    }
    checks.forEach(ch => ch.addEventListener("change", atualizar));
    todas.addEventListener("change", () => { checks.forEach(ch => { ch.checked = todas.checked; }); atualizar(); });
    comprar.addEventListener("click", () => {
      const itens = checks.filter(ch => ch.checked).map(ch => {
        const p = mapa.get(ch.dataset.selecionar);
        const orientacao = p.orientacao === "horizontal" ? "horizontal" : "vertical";
        const seletor = [...el.querySelectorAll("[data-tamanho]")].find(s => s.dataset.tamanho === p.id && s.checked);
        const opcao = OPCOES[orientacao].find(o => o.medida === seletor.value);
        return {id:p.id,nome:p.nome,imagem:p.imagem,categoria:p.categoria,orientacao:p.orientacao || "",medida:opcao.medida,preco:opcao.preco,quantidade:1,quantity:1};
      });
      try {
        const antigo = JSON.parse(localStorage.getItem("heeeph_cart") || "[]");
        const carrinho = Array.isArray(antigo) ? antigo : [];
        itens.forEach(item => {
          const existente = carrinho.find(c => c.id === item.id && c.medida === item.medida);
          if (existente) {
            const quantidade = Number(existente.quantidade || existente.quantity || 1) + 1;
            existente.quantidade = quantidade;
            existente.quantity = quantidade;
          } else carrinho.push(item);
        });
        localStorage.setItem("heeeph_cart", JSON.stringify(carrinho));
        localStorage.setItem("ultimaPagina", "minha-heeeph.html");
        window.location.href = "carrinho.html";
      } catch (_) { alert("Não foi possível adicionar ao carrinho. Verifique o armazenamento do navegador."); }
    });
    atualizar();
  }
  function iniciar() {
    linkMenu();
    atualizarContador();
    instalarEstrelas();
    mostrarConta();
    window.addEventListener("storage", e => {
      if (e.key === CHAVE) { favoritos = ler(); atualizarEstrelas(); mostrarConta(); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
