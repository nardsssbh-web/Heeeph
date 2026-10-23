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
      a.textContent = "⭐ MINHA HEEEPH";
      menu.append(a);
    }
  }
  function atualizarEstrelas() {
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
  function instalarEstrelas() {
    document.querySelectorAll(".item-placa[id^='produto-']").forEach(card => {
      if (card.querySelector("[data-favorito-id]")) return;
      const id = card.id.slice("produto-".length);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "favorito-estrela";
      btn.dataset.favoritoId = id;
      btn.addEventListener("click", () => alternar(id));
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
  function mostrarConta() {
    const el = document.getElementById("contaConteudo");
    if (!el) return;
    const mapa = catalogo();
    const cards = [...favoritos].map(id => {
      const p = mapa.get(id);
      if (!p) return "";
      const url = p.categoria + ".html?produto=" + encodeURIComponent(id);
      return '<article class="favoritos-item"><img src="' + esc(p.imagem) + '" alt="' + esc(p.nome) + '" loading="lazy"><strong>' + esc(p.nome) + '</strong><a href="' + esc(url) + '">Ver placa</a><button type="button" data-remover="' + esc(id) + '">Remover ★</button></article>';
    }).join("");
    el.innerHTML = '<h2>Minhas favoritas (' + favoritos.size + ')</h2>' +
      (cards ? '<div class="favoritos-grade">' + cards + '</div>' : '<p>Você ainda não salvou placas. <a href="categorias.html">Explorar coleções</a></p>') +
      '<p>As favoritas ficam guardadas somente neste navegador. Não é necessário cadastro.</p>';
    el.querySelectorAll("[data-remover]").forEach(b => b.addEventListener("click", () => alternar(b.dataset.remover)));
  }
  function iniciar() {
    linkMenu();
    instalarEstrelas();
    mostrarConta();
    window.addEventListener("storage", e => {
      if (e.key === CHAVE) { favoritos = ler(); atualizarEstrelas(); mostrarConta(); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
