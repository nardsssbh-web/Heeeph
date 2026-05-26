const OPCOES_TAMANHO = {
  vertical: [
    { medida: "10x15cm", preco: 12.90 },
    { medida: "20x28cm", preco: 24.90 }
  ],
  horizontal: [
    { medida: "15x10cm", preco: 12.90 },
    { medida: "28x20cm", preco: 24.90 }
  ]
};

let produtoSelecionado = null;

function escaparTexto(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function produtoIndisponivel(produto) {
  const nome = String(produto.nome || "").trim().toLowerCase();

  return (
    nome === "em breve" ||
    nome.includes("em breve")
  );
}

function getCart() {
  const cart = JSON.parse(localStorage.getItem("heeeph_cart")) || [];
  return Array.isArray(cart) ? cart : [];
}

function saveCart(cart) {
  localStorage.setItem("heeeph_cart", JSON.stringify(cart));
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

function obterCategoriaAtual() {
  return document.body.dataset.categoria || "";
}

function obterProdutosDaCategoria() {
  const categoria = obterCategoriaAtual();

  if (!categoria) return [];

  if (typeof PRODUTOS === "undefined") {
    console.error("PRODUTOS não foi encontrado. Confira se produtos.js foi carregado antes de galeria.js.");
    return [];
  }

  return PRODUTOS[categoria] || [];
}

function renderizarGaleria() {
  const grade = document.getElementById("gradePlacas");
  const produtos = obterProdutosDaCategoria();

  if (!grade) return;

  if (!produtos.length) {
    grade.innerHTML = `
      <div class="vazio">
        <h2>Nenhuma placa encontrada</h2>
        <p>Esta categoria ainda não possui produtos cadastrados.</p>
      </div>
    `;
    return;
  }

  grade.innerHTML = produtos.map(produto => {
    const indisponivel = produtoIndisponivel(produto);

    return `
      <div class="item-placa" id="produto-${escaparTexto(produto.id)}">
        <div class="placa ${indisponivel ? "placa-indisponivel" : ""}">
          <div class="nome-placa">${escaparTexto(produto.nome)}</div>

          <div class="img-box">
            <img
              class="zoomable"
              src="${escaparTexto(produto.imagem)}"
              alt="${escaparTexto(produto.nome)}"
              onclick="abrirZoom('${escaparTexto(produto.imagem)}', '${escaparTexto(produto.nome)}')"
            >
          </div>
        </div>

        ${
          indisponivel
            ? `
              <div class="preco-placa produto-em-breve">Em breve</div>
              <button class="btn-comprar-placa btn-indisponivel" disabled>
                Indisponível
              </button>
            `
            : `
              <div class="preco-placa">A partir de R$12,90</div>
              <button class="btn-comprar-placa" onclick="abrirModalTamanho('${escaparTexto(produto.id)}')">
                Comprar
              </button>
            `
        }
      </div>
    `;
  }).join("");

  destacarProdutoDaUrl();
}

function criarModaisSeNaoExistirem() {
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

  if (!document.getElementById("modalTamanho")) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-tamanho-overlay" id="modalTamanho">
        <div class="modal-tamanho-box">
          <button class="fechar-tamanho" onclick="fecharModalTamanho()">×</button>

          <div class="modal-tamanho-titulo">Escolha o tamanho</div>
          <div class="modal-tamanho-nome" id="modalTamanhoNome"></div>

          <div class="opcoes-tamanho" id="opcoesTamanho"></div>
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

function abrirModalTamanho(idProduto) {
  const produtos = obterProdutosDaCategoria();
  produtoSelecionado = produtos.find(produto => produto.id === idProduto);

  if (!produtoSelecionado) {
    alert("Produto não encontrado.");
    return;
  }

  if (produtoIndisponivel(produtoSelecionado)) {
  alert("Este produto ainda está em breve e não pode ser comprado.");
  produtoSelecionado = null;
  return;
}

  const modal = document.getElementById("modalTamanho");
  const nome = document.getElementById("modalTamanhoNome");
  const opcoes = document.getElementById("opcoesTamanho");

  if (!modal || !nome || !opcoes) return;

  const orientacao = produtoSelecionado.orientacao || "vertical";
  const listaOpcoes = OPCOES_TAMANHO[orientacao] || OPCOES_TAMANHO.vertical;

  nome.textContent = produtoSelecionado.nome;

  opcoes.innerHTML = listaOpcoes.map(opcao => {
    return `
      <button
        class="btn-opcao-tamanho"
        onclick="adicionarProdutoComTamanho('${escaparTexto(opcao.medida)}', ${Number(opcao.preco)})"
      >
        ${escaparTexto(opcao.medida)} — ${formatarPreco(opcao.preco)}
      </button>
    `;
  }).join("");

  modal.classList.add("ativo");
}

function fecharModalTamanho() {
  const modal = document.getElementById("modalTamanho");

  if (modal) {
    modal.classList.remove("ativo");
  }

  produtoSelecionado = null;
}

function adicionarProdutoComTamanho(medida, preco) {
  if (!produtoSelecionado) {
    alert("Nenhum produto selecionado.");
    return;
  }

  const carrinho = getCart();

  const itemExistente = carrinho.find(item => {
    return item.id === produtoSelecionado.id && item.medida === medida;
  });

  if (itemExistente) {
    const qtdAtual = Number(itemExistente.quantidade || itemExistente.quantity || 1);
    itemExistente.quantidade = qtdAtual + 1;
    itemExistente.quantity = qtdAtual + 1;
  } else {
    carrinho.push({
      id: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      imagem: produtoSelecionado.imagem,
      categoria: obterCategoriaAtual(),
      orientacao: produtoSelecionado.orientacao || "",
      medida: medida,
      preco: preco,
      quantidade: 1,
      quantity: 1
    });
  }

  saveCart(carrinho);
updateCartCount();
fecharModalTamanho();

const paginaAtual = window.location.pathname.split("/").pop() || "categorias.html";
localStorage.setItem("ultimaPagina", paginaAtual);

window.location.href = "carrinho.html";
}

function destacarProdutoDaUrl() {
  const params = new URLSearchParams(window.location.search);
  const idProduto = params.get("produto");

  if (!idProduto) return;

  setTimeout(() => {
    const elemento = document.getElementById(`produto-${idProduto}`);

    if (elemento) {
      elemento.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      elemento.style.transition = "transform .25s ease, filter .25s ease";
      elemento.style.transform = "scale(1.04)";
      elemento.style.filter = "brightness(1.15)";

      setTimeout(() => {
        elemento.style.transform = "";
        elemento.style.filter = "";
      }, 1200);
    }
  }, 300);
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    fecharZoom();
    fecharModalTamanho();
  }
});

document.addEventListener("click", function(event) {
  const modalZoom = document.getElementById("modalZoom");
  const modalTamanho = document.getElementById("modalTamanho");

  if (event.target === modalZoom) {
    fecharZoom();
  }

  if (event.target === modalTamanho) {
    fecharModalTamanho();
  }
});
const paginaAtualGaleria = window.location.pathname.split("/").pop();

if (paginaAtualGaleria) {
  localStorage.setItem("ultimaPagina", paginaAtualGaleria);
}
criarModaisSeNaoExistirem();
renderizarGaleria();
updateCartCount();