function escaparTexto(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCart() {
  const cart = JSON.parse(localStorage.getItem("heeeph_cart")) || [];
  return Array.isArray(cart) ? cart : [];
}

function updateCartCount() {
  const cart = getCart();

  const total = cart.reduce((acc, item) => {
    const qtd = Number(item.quantidade || item.quantity || 1);
    return acc + (isNaN(qtd) ? 1 : qtd);
  }, 0);

  const countEl = document.getElementById("cartCount");

  if (countEl) {
    countEl.textContent = total;
  }
}

function obterFotosReais() {
  if (typeof PRODUTOS === "undefined") {
    console.error("PRODUTOS não foi encontrado. Confira se produtos.js foi carregado.");
    return [];
  }

  return PRODUTOS["fotos-reais"] || [];
}

function renderizarFotosReais() {
  const grade = document.getElementById("gradeFotosReais");
  const fotos = obterFotosReais();

  if (!grade) return;

  if (!fotos.length) {
    grade.innerHTML = `
      <div class="vazio">
        <h2>Nenhuma foto real encontrada</h2>
        <p>Cadastre as imagens reais no produtos.js dentro da categoria reais.</p>
      </div>
    `;
    return;
  }

  grade.innerHTML = fotos.map(foto => {
    return `
      <div class="item-placa">
        <div class="placa">
          <div class="nome-placa">${escaparTexto(foto.nome || "Foto real HEEEPH")}</div>

          <div class="img-box">
            <img
              class="zoomable"
              src="${escaparTexto(foto.imagem)}"
              alt="${escaparTexto(foto.nome || "Foto real HEEEPH")}"
              onclick="abrirZoom('${escaparTexto(foto.imagem)}', '${escaparTexto(foto.nome || "Foto real HEEEPH")}')"
            >
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function criarModalZoomSeNaoExistir() {
  if (!document.getElementById("modalZoom")) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-zoom" id="modalZoom">
        <div class="modal-zoom-conteudo">
          <button class="fechar-zoom" onclick="fecharZoom()">×</button>
          <img id="imagemZoom" src="" alt="">
        </div>
      </div>
    `);
  }
}

function abrirZoom(imagem, nome) {
  const modal = document.getElementById("modalZoom");
  const img = document.getElementById("imagemZoom");

  if (!modal || !img) return;

  img.src = imagem;
  img.alt = nome || "Imagem ampliada";

  modal.classList.add("ativo");
}

function fecharZoom() {
  const modal = document.getElementById("modalZoom");

  if (modal) {
    modal.classList.remove("ativo");
  }
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    fecharZoom();
  }
});

document.addEventListener("click", function(event) {
  const modalZoom = document.getElementById("modalZoom");

  if (event.target === modalZoom) {
    fecharZoom();
  }
});

criarModalZoomSeNaoExistir();
renderizarFotosReais();
updateCartCount();