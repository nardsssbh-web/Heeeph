function getCart() {
  const cart = JSON.parse(localStorage.getItem("heeeph_cart")) || [];
  return Array.isArray(cart) ? cart : [];
}

function updateCartCount() {
  const cart = getCart();

  const total = cart.reduce((acc, item) => {
    const qtd = Number(item.quantity || item.quantidade || 1);
    return acc + (isNaN(qtd) ? 1 : qtd);
  }, 0);

  const countEl = document.getElementById("cartCount");

  if (countEl) {
    countEl.textContent = total;
  }
}

const produtosDestaque =
  typeof getProdutosDestaqueHome === "function"
    ? getProdutosDestaqueHome()
    : [];

let currentIndex = 0;
let intervaloCarrossel = null;

function pegarCategoriaDoProduto(produto) {
  if (!produto) return "";

  if (produto.categoria) {
    return produto.categoria;
  }

  if (produto.id && String(produto.id).includes("-")) {
    return String(produto.id).split("-")[0];
  }

  return "";
}

function renderCarouselPrincipal() {
  const placaPrincipal = document.getElementById("placaPrincipal");
  const medidaAtual = document.getElementById("medidaAtual");
  const nomeAtual = document.getElementById("nomeAtual");

  if (!placaPrincipal || !medidaAtual || !nomeAtual) return;

  if (!produtosDestaque.length) {
    placaPrincipal.src = "";
    placaPrincipal.alt = "Sem destaque";
    medidaAtual.textContent = "";
    nomeAtual.textContent = "Nenhuma placa encontrada";
    return;
  }

  const produto = produtosDestaque[currentIndex];

  placaPrincipal.src = produto.imagem || "";
  placaPrincipal.alt = produto.nome || "Placa em destaque";

  if (produto.orientacao === "horizontal") {
    medidaAtual.textContent = produto.medida || "28x20cm";
  } else {
    medidaAtual.textContent = produto.medida || "20x28cm";
  }

  nomeAtual.textContent = produto.nome || "";
}

function abrirGaleriaDoDestaque() {
  if (!produtosDestaque.length) return;

  const produto = produtosDestaque[currentIndex];
  const categoria = pegarCategoriaDoProduto(produto);

  if (!categoria || !produto.id) {
    alert("Produto de destaque sem categoria ou id configurado.");
    return;
  }

  localStorage.setItem("ultimaPagina", "index.html");
  window.location.href = `${categoria}.html?produto=${encodeURIComponent(produto.id)}`;
}

function irParaAnterior() {
  if (!produtosDestaque.length) return;

  currentIndex =
    (currentIndex - 1 + produtosDestaque.length) % produtosDestaque.length;

  renderCarouselPrincipal();
  reiniciarCarrosselAutomatico();
}

function irParaProximo() {
  if (!produtosDestaque.length) return;

  currentIndex = (currentIndex + 1) % produtosDestaque.length;

  renderCarouselPrincipal();
  reiniciarCarrosselAutomatico();
}

function iniciarCarrosselAutomatico() {
  if (!produtosDestaque.length || produtosDestaque.length <= 1) return;

  intervaloCarrossel = setInterval(() => {
    currentIndex = (currentIndex + 1) % produtosDestaque.length;
    renderCarouselPrincipal();
  }, 2000);
}

function reiniciarCarrosselAutomatico() {
  if (intervaloCarrossel) {
    clearInterval(intervaloCarrossel);
  }

  iniciarCarrosselAutomatico();
}

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const btnComprar = document.getElementById("btnComprar");
const placaClick = document.getElementById("placaClick");

if (prevBtn) {
  prevBtn.addEventListener("click", irParaAnterior);
}

if (nextBtn) {
  nextBtn.addEventListener("click", irParaProximo);
}

if (btnComprar) {
  btnComprar.addEventListener("click", abrirGaleriaDoDestaque);
}

if (placaClick) {
  placaClick.addEventListener("click", abrirGaleriaDoDestaque);
}

updateCartCount();
renderCarouselPrincipal();
iniciarCarrosselAutomatico();