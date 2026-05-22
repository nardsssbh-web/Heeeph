const CHECKOUT_EM_TESTE = true;
const LINK_MERCADO_PAGO = "https://link.mercadopago.com.br/heeeph";
const WHATSAPP_HEEEPH = "5511998302901";

let freteAtual = 0;
let subtotalAtual = 0;

function precoParaNumero(preco) {
  if (!preco) return 0;
  if (typeof preco === "number") return preco;
  if (preco === "preço aqui") return 0;

  return Number(
    String(preco)
      .replace(/[^\d,.-]/g, "")
      .replace(",", ".")
  ) || 0;
}

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarCEP(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .slice(0, 9);
}

function obterCarrinhoSeguro() {
  if (typeof obterCarrinho === "function") {
    const carrinho = obterCarrinho();
    return Array.isArray(carrinho) ? carrinho : [];
  }

  const carrinho = JSON.parse(localStorage.getItem("heeeph_cart")) || [];
  return Array.isArray(carrinho) ? carrinho : [];
}

function salvarCarrinhoSeguro(carrinho) {
  if (typeof salvarCarrinho === "function") {
    salvarCarrinho(carrinho);
    return;
  }

  localStorage.setItem("heeeph_cart", JSON.stringify(carrinho));
}

function contarItensCarrinhoSeguro() {
  if (typeof contarItensCarrinho === "function") {
    return contarItensCarrinho();
  }

  const carrinho = obterCarrinhoSeguro();

  return carrinho.reduce((total, item) => {
    const qtd = Number(item.quantidade || item.quantity || 1);
    return total + (isNaN(qtd) ? 1 : qtd);
  }, 0);
}

function updateCartCount() {
  const countEl = document.getElementById("cartCount");

  if (countEl) {
    countEl.textContent = contarItensCarrinhoSeguro();
  }
}

function alterarQuantidadeSeguro(id, mudanca) {
  if (typeof alterarQuantidade === "function") {
    alterarQuantidade(id, mudanca);
    return;
  }

  const carrinho = obterCarrinhoSeguro();

  const novoCarrinho = carrinho.map(item => {
    if (item.id === id) {
      const qtdAtual = Number(item.quantidade || item.quantity || 1);
      const novaQtd = Math.max(1, qtdAtual + mudanca);
      return { ...item, quantidade: novaQtd };
    }

    return item;
  });

  salvarCarrinhoSeguro(novoCarrinho);
}

function removerDoCarrinhoSeguro(id) {
  if (typeof removerDoCarrinho === "function") {
    removerDoCarrinho(id);
    return;
  }

  const carrinho = obterCarrinhoSeguro();
  const novoCarrinho = carrinho.filter(item => item.id !== id);
  salvarCarrinhoSeguro(novoCarrinho);
}

function calcularValorFretePorCEP(cepLimpo, quantidadeTotal) {
  const inicio = Number(cepLimpo.charAt(0));

  let freteBase = 0;

  if (inicio >= 0 && inicio <= 1) freteBase = 19.90;
  else if (inicio >= 2 && inicio <= 3) freteBase = 24.90;
  else if (inicio >= 4 && inicio <= 5) freteBase = 29.90;
  else if (inicio >= 6 && inicio <= 7) freteBase = 34.90;
  else freteBase = 39.90;

  if (quantidadeTotal <= 1) return freteBase;
  if (quantidadeTotal <= 3) return freteBase + 8.00;
  if (quantidadeTotal <= 5) return freteBase + 15.00;
  if (quantidadeTotal <= 8) return freteBase + 25.00;

  return freteBase + 35.00;
}

function atualizarTotalComFrete() {
  const freteEl = document.getElementById("freteValor");
  const totalEl = document.getElementById("totalValor");

  if (!freteEl || !totalEl) return;

  freteEl.textContent = freteAtual > 0 ? formatarPreco(freteAtual) : "A combinar";

  if (subtotalAtual > 0) {
    totalEl.textContent = freteAtual > 0
      ? formatarPreco(subtotalAtual + freteAtual)
      : formatarPreco(subtotalAtual);
  } else {
    totalEl.textContent = "preço aqui";
  }
}

function calcularFrete() {
  const input = document.getElementById("cepFrete");
  const mensagem = document.getElementById("mensagemFrete");

  if (!input || !mensagem) return;

  const cepFormatado = formatarCEP(input.value);
  const cepLimpo = cepFormatado.replace(/\D/g, "");

  input.value = cepFormatado;
  localStorage.setItem("cepFreteSalvo", cepFormatado);

  if (cepLimpo.length !== 8) {
    freteAtual = 0;
    localStorage.removeItem("freteAtualSalvo");
    mensagem.textContent = "Digite um CEP válido com 8 números.";
    atualizarTotalComFrete();
    return;
  }

  const carrinho = obterCarrinhoSeguro();

  const quantidadeTotal = carrinho.reduce((total, item) => {
    const qtd = Number(item.quantidade || item.quantity || 1);
    return total + (isNaN(qtd) ? 1 : qtd);
  }, 0);

  freteAtual = calcularValorFretePorCEP(cepLimpo, quantidadeTotal);
  localStorage.setItem("freteAtualSalvo", String(freteAtual));

  mensagem.textContent = `Frete estimado para ${quantidadeTotal} placa(s), CEP ${cepFormatado}: ${formatarPreco(freteAtual)}.`;

  atualizarTotalComFrete();
}

document.addEventListener("input", function (event) {
  if (event.target && event.target.id === "cepFrete") {
    event.target.value = formatarCEP(event.target.value);
  }
});

function montarMensagemWhatsApp() {
  const carrinho = obterCarrinhoSeguro();
  const cepSalvo = localStorage.getItem("cepFreteSalvo") || "";

  let totalItens = 0;
  let totalProdutos = 0;

  const linhasProdutos = carrinho.map(item => {
    const quantidade = Number(item.quantidade || item.quantity || 1);
    const precoUnitario = precoParaNumero(item.preco);
    const subtotal = precoUnitario * quantidade;

    totalItens += quantidade;
    totalProdutos += subtotal;

    return `- ${item.nome} | ${item.medida || ""} | Qtd: ${quantidade} | Valor: ${precoUnitario > 0 ? formatarPreco(precoUnitario) : (item.preco || "preço aqui")}`;
  }).join("\n");

  let mensagem = "Olá! Tenho interesse nestas placas:\n\n";
  mensagem += linhasProdutos;
  mensagem += "\n\nTotal de itens: " + totalItens;

  if (totalProdutos > 0) {
    mensagem += "\nSubtotal: " + formatarPreco(totalProdutos);
  }

  if (cepSalvo) {
    mensagem += "\nCEP informado: " + cepSalvo;
  }

  if (freteAtual > 0) {
    mensagem += "\nFrete estimado: " + formatarPreco(freteAtual);
  }

  if (totalProdutos > 0 && freteAtual > 0) {
    mensagem += "\nTotal com frete: " + formatarPreco(totalProdutos + freteAtual);
  }

  mensagem += "\n\nQuero confirmar disponibilidade, frete e forma de pagamento.";

  return encodeURIComponent(mensagem);
}

function abrirWhatsAppPedido() {
  const carrinho = obterCarrinhoSeguro();

  if (!carrinho.length) {
    alert("Seu carrinho está vazio.");
    return;
  }

  const url = `https://wa.me/${WHATSAPP_HEEEPH}?text=${montarMensagemWhatsApp()}`;
  window.open(url, "_blank");
}

function finalizarCheckoutTeste() {
  const carrinho = obterCarrinhoSeguro();

  if (!carrinho.length) {
    alert("Seu carrinho está vazio.");
    return;
  }

  if (CHECKOUT_EM_TESTE) {
    alert(
      "Checkout em fase de teste.\n\n" +
      "A compra online ainda NÃO será finalizada pelo site.\n\n" +
      "Por enquanto, use o botão de WhatsApp para confirmar o pedido manualmente."
    );
    return;
  }

  window.open(LINK_MERCADO_PAGO, "_blank");
}

function renderCarrinho() {
  const container = document.getElementById("conteudoCarrinho");

  if (!container) return;

  const carrinho = obterCarrinhoSeguro();

  if (!carrinho.length) {
    freteAtual = 0;
    subtotalAtual = 0;

    container.innerHTML = `
      <div class="vazio">
        <h2>Carrinho vazio</h2>
        <p>Você ainda não adicionou nenhuma placa.</p>
        <a class="botao botao-amarelo" href="categorias.html">ESCOLHER PLACAS</a>
      </div>
    `;

    updateCartCount();
    return;
  }

  let totalItens = 0;
  let totalGeral = 0;

  const listaHtml = carrinho.map(item => {
    const quantidade = Number(item.quantidade || item.quantity || 1);
    const precoUnitario = precoParaNumero(item.preco);
    const subtotal = precoUnitario * quantidade;

    totalItens += quantidade;
    totalGeral += subtotal;

    return `
      <div class="item-carrinho">
        <div class="item-img">
          <img src="${item.imagem || ""}" alt="${item.nome || "Produto"}">
        </div>

        <div class="item-info">
          <h2>${item.nome || "Produto"}</h2>
          <div class="item-medida">${item.medida || ""}</div>
          <div class="item-preco">${precoUnitario > 0 ? formatarPreco(precoUnitario) : (item.preco || "preço aqui")}</div>

          <div class="quantidade-area">
            <button class="quantidade-btn" onclick="diminuirQuantidade('${item.id}')">-</button>
            <span class="quantidade-numero">${quantidade}</span>
            <button class="quantidade-btn" onclick="aumentarQuantidade('${item.id}')">+</button>
          </div>

          <button class="remover-btn" onclick="excluirItem('${item.id}')">REMOVER</button>
        </div>

        <div class="subtotal-item">
          ${precoUnitario > 0 ? formatarPreco(subtotal) : (item.preco || "preço aqui")}
        </div>
      </div>
    `;
  }).join("");

  subtotalAtual = totalGeral;

  const textoBotaoMercado = CHECKOUT_EM_TESTE
    ? "CHECKOUT EM TESTE"
    : "PAGAR COM MERCADO PAGO";

  const avisoTeste = CHECKOUT_EM_TESTE
    ? `
      <div class="aviso-teste">
        <strong>Checkout em fase de teste.</strong><br>
        A compra online ainda não está liberada. O botão do Mercado Pago está bloqueado para evitar pagamento real antes dos testes.
      </div>
    `
    : "";

  container.innerHTML = `
    <div class="carrinho-box">
      <div class="lista-carrinho">
        ${listaHtml}
      </div>

      <aside class="resumo-carrinho">
        <h3>Resumo</h3>

        ${avisoTeste}

        <div class="linha-resumo">
          <span>Itens</span>
          <strong>${totalItens}</strong>
        </div>

        <div class="linha-resumo">
          <span>Subtotal</span>
          <strong id="subtotalValor">${totalGeral > 0 ? formatarPreco(totalGeral) : "preço aqui"}</strong>
        </div>

        <div class="bloco-frete">
          <label for="cepFrete">Calcular frete</label>

          <div class="frete-linha">
            <input
              type="text"
              id="cepFrete"
              class="cep-input"
              placeholder="Digite seu CEP"
              maxlength="9"
            />

            <button class="botao botao-escuro" style="width:auto; min-width:140px;" onclick="calcularFrete()">
              CALCULAR
            </button>
          </div>

          <div id="mensagemFrete" class="mensagem-frete"></div>
        </div>

        <div class="linha-resumo">
          <span>Frete</span>
          <strong id="freteValor">A combinar</strong>
        </div>

        <div class="linha-resumo total">
          <span>Total</span>
          <strong id="totalValor">${totalGeral > 0 ? formatarPreco(totalGeral) : "preço aqui"}</strong>
        </div>

        <div class="acoes">
          <button class="botao botao-zap" onclick="abrirWhatsAppPedido()">
            FINALIZAR PELO WHATSAPP
          </button>

          <button class="botao botao-mercado" onclick="finalizarCheckoutTeste()">
            ${textoBotaoMercado}
          </button>

          <a class="botao botao-continuar" href="#" id="btnContinuarComprando">
            CONTINUAR COMPRANDO
          </a>

          <button class="botao botao-esvaziar" onclick="limparCarrinho()">
            ESVAZIAR CARRINHO
          </button>
        </div>
      </aside>
    </div>
  `;

  configurarBotaoContinuarComprando();
  restaurarFreteSalvo();
  atualizarTotalComFrete();
  updateCartCount();
}

function aumentarQuantidade(id) {
  alterarQuantidadeSeguro(id, 1);
  renderCarrinho();
  reaplicarFreteSeJaHouverCEP();
}

function diminuirQuantidade(id) {
  alterarQuantidadeSeguro(id, -1);
  renderCarrinho();
  reaplicarFreteSeJaHouverCEP();
}

function excluirItem(id) {
  removerDoCarrinhoSeguro(id);
  renderCarrinho();
  reaplicarFreteSeJaHouverCEP();
}

function limparCarrinho() {
  freteAtual = 0;
  subtotalAtual = 0;
  localStorage.removeItem("heeeph_cart");
  localStorage.removeItem("cepFreteSalvo");
  localStorage.removeItem("freteAtualSalvo");
  renderCarrinho();
}

function configurarBotaoContinuarComprando() {
  const botao = document.getElementById("btnContinuarComprando");

  if (!botao) return;

  const ultimaPagina = localStorage.getItem("ultimaPagina") || "categorias.html";
  botao.href = ultimaPagina;
}

function restaurarFreteSalvo() {
  const cepSalvo = localStorage.getItem("cepFreteSalvo") || "";
  const freteSalvo = Number(localStorage.getItem("freteAtualSalvo") || "0");
  const input = document.getElementById("cepFrete");
  const mensagem = document.getElementById("mensagemFrete");

  if (input && cepSalvo) {
    input.value = formatarCEP(cepSalvo);
  }

  if (cepSalvo && freteSalvo > 0) {
    freteAtual = freteSalvo;

    if (mensagem) {
      mensagem.textContent = `Frete estimado para o CEP ${formatarCEP(cepSalvo)}: ${formatarPreco(freteAtual)}.`;
    }
  }
}

function reaplicarFreteSeJaHouverCEP() {
  const cepSalvo = localStorage.getItem("cepFreteSalvo") || "";

  if (!cepSalvo) {
    atualizarTotalComFrete();
    return;
  }

  const input = document.getElementById("cepFrete");

  if (input) {
    input.value = formatarCEP(cepSalvo);
    calcularFrete();
  }
}

renderCarrinho();