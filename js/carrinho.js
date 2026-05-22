Boa. Agora vamos para o funcionamento do carrinho.

Abra:

```txt id="ygsmif"
js/carrinho.js
```

Cole este código inteiro e salve:

```js id="kr3q8f"
function getCart() {
  const cart = JSON.parse(localStorage.getItem("heeeph_cart")) || [];
  return Array.isArray(cart) ? cart : [];
}

function saveCart(cart) {
  localStorage.setItem("heeeph_cart", JSON.stringify(cart));
}

function formatPrice(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function updateCartCount() {
  const cart = getCart();

  const total = cart.reduce((acc, item) => {
    return acc + (item.quantity || 1);
  }, 0);

  const countEl = document.getElementById("cartCount");

  if (countEl) {
    countEl.textContent = total;
  }
}

function calcularSubtotal(item) {
  return (item.preco || 0) * (item.quantity || 1);
}

function calcularTotal(cart) {
  return cart.reduce((acc, item) => {
    return acc + calcularSubtotal(item);
  }, 0);
}

function alterarQuantidade(index, delta) {
  const cart = getCart();

  if (!cart[index]) return;

  cart[index].quantity += delta;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  saveCart(cart);
  renderCarrinho();
}

function removerItem(index) {
  const cart = getCart();

  cart.splice(index, 1);

  saveCart(cart);
  renderCarrinho();
}

function esvaziarCarrinho() {
  localStorage.removeItem("heeeph_cart");
  renderCarrinho();
}

function montarMensagemWhatsApp(cart, total, freteTexto) {
  let mensagem = "Olá! Quero confirmar este pedido:%0A%0A";

  cart.forEach(item => {
    mensagem += `• ${item.nome}%0A`;
    mensagem += `Tamanho: ${item.medida}%0A`;
    mensagem += `Qtd: ${item.quantity}%0A`;
    mensagem += `Subtotal: ${formatPrice(calcularSubtotal(item))}%0A%0A`;
  });

  mensagem += `Total dos produtos: ${formatPrice(total)}%0A`;

  if (freteTexto) {
    mensagem += `${freteTexto}%0A`;
  }

  mensagem += "%0ALoja em fase de testes.";

  return mensagem;
}

function calcularFreteFake(cep) {
  const somenteNumeros = cep.replace(/\D/g, "");

  if (somenteNumeros.length !== 8) {
    return null;
  }

  return {
    valor: 18.90,
    prazo: "3 a 7 dias úteis"
  };
}

function renderCarrinho() {
  const container = document.getElementById("conteudoCarrinho");

  if (!container) return;

  const cart = getCart();

  updateCartCount();

  if (!cart.length) {
    container.innerHTML = `
      <div class="vazio">
        <h2>Seu carrinho está vazio</h2>
        <p>Escolha algumas placas para continuar.</p>

        <a href="categorias.html" class="botao botao-continuar">
          Ver Coleções
        </a>
      </div>
    `;

    return;
  }

  const total = calcularTotal(cart);

  container.innerHTML = `
    <div class="carrinho-box">

      <div class="lista-carrinho">
        ${cart.map((item, index) => `
          <div class="item-carrinho">

            <div class="item-img">
              <img src="${item.imagem}" alt="${item.nome}">
            </div>

            <div class="item-info">
              <h2>${item.nome}</h2>

              <div class="item-medida">
                Tamanho: ${item.medida}
              </div>

              <div class="item-preco">
                ${formatPrice(item.preco || 0)}
              </div>

              <div class="quantidade-area">
                <button class="quantidade-btn" onclick="alterarQuantidade(${index}, -1)">-</button>

                <div class="quantidade-numero">
                  ${item.quantity || 1}
                </div>

                <button class="quantidade-btn" onclick="alterarQuantidade(${index}, 1)">+</button>
              </div>

              <button class="remover-btn" onclick="removerItem(${index})">
                Remover item
              </button>
            </div>

            <div class="subtotal-item">
              ${formatPrice(calcularSubtotal(item))}
            </div>

          </div>
        `).join("")}
      </div>

      <div class="resumo-carrinho">

        <h3>Resumo</h3>

        <div class="aviso-teste">
          O checkout ainda está em fase de testes.
          Os pedidos são confirmados pelo WhatsApp antes do pagamento.
        </div>

        <div class="linha-resumo">
          <span>Produtos</span>
          <strong>${formatPrice(total)}</strong>
        </div>

        <div class="bloco-frete">

          <label for="cep">Calcular frete</label>

          <div class="frete-linha">
            <input
              type="text"
              id="cep"
              class="cep-input"
              placeholder="Digite seu CEP"
              maxlength="9"
            >

            <button class="botao botao-amarelo" id="btnFrete">
              Calcular
            </button>
          </div>

          <div class="mensagem-frete" id="mensagemFrete"></div>

        </div>

        <div class="linha-resumo total">
          <span>Total</span>
          <strong id="valorTotal">${formatPrice(total)}</strong>
        </div>

        <div class="acoes">

          <button class="botao botao-zap" id="btnWhats">
            Finalizar pelo WhatsApp
          </button>

          <button class="botao botao-mercado" id="btnMercado">
            Mercado Pago (em teste)
          </button>

          <a href="categorias.html" class="botao botao-continuar">
            Continuar comprando
          </a>

          <button class="botao botao-esvaziar" id="btnEsvaziar">
            Esvaziar carrinho
          </button>

        </div>

      </div>

    </div>
  `;

  const btnWhats = document.getElementById("btnWhats");
  const btnMercado = document.getElementById("btnMercado");
  const btnEsvaziar = document.getElementById("btnEsvaziar");
  const btnFrete = document.getElementById("btnFrete");

  let valorFrete = 0;
  let freteTexto = "";

  if (btnFrete) {
    btnFrete.addEventListener("click", () => {
      const cepInput = document.getElementById("cep");
      const mensagemFrete = document.getElementById("mensagemFrete");
      const valorTotalEl = document.getElementById("valorTotal");

      const resultado = calcularFreteFake(cepInput.value);

      if (!resultado) {
        mensagemFrete.textContent = "Digite um CEP válido.";
        return;
      }

      valorFrete = resultado.valor;

      freteTexto =
        `Frete estimado: ${formatPrice(resultado.valor)} (${resultado.prazo})`;

      mensagemFrete.textContent = freteTexto;

      valorTotalEl.textContent =
        formatPrice(total + valorFrete);
    });
  }

  if (btnWhats) {
    btnWhats.addEventListener("click", () => {
      const mensagem =
        montarMensagemWhatsApp(cart, total + valorFrete, freteTexto);

      window.open(
        `https://wa.me/5511998302901?text=${mensagem}`,
        "_blank"
      );
    });
  }

  if (btnMercado) {
    btnMercado.addEventListener("click", () => {
      alert(
        "Mercado Pago ainda está em fase de testes."
      );
    });
  }

  if (btnEsvaziar) {
    btnEsvaziar.addEventListener("click", () => {
      esvaziarCarrinho();
    });
  }
}

renderCarrinho();
updateCartCount();