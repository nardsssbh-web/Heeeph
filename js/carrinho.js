const CHECKOUT_EM_TESTE = true;
const WHATSAPP_HEEEPH = "5511998302901";

let freteAtual = 0;
let opcaoFreteAtual = null;
let opcoesFrete = [];
let freteEmTeste = false;
let consultaFrete = 0;
let controleFrete = null;
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

function alterarQuantidadeSeguro(indice, mudanca) {
  const carrinho = obterCarrinhoSeguro();
  const item = carrinho[indice];
  if (!item) return;
  const quantidade = Number(item.quantidade || item.quantity || 1) + mudanca;
  if (quantidade <= 0) carrinho.splice(indice, 1);
  else { item.quantidade = quantidade; item.quantity = quantidade; }
  salvarCarrinhoSeguro(carrinho);
}

function removerDoCarrinhoSeguro(indice) {
  const carrinho = obterCarrinhoSeguro();
  carrinho.splice(indice, 1);
  salvarCarrinhoSeguro(carrinho);
}

function resumoPacotes() {
  const elemento = document.getElementById('resumoPacotes');
  if (!elemento || typeof EmbalagensHEEEPH === 'undefined') return;
  try {
    const pacotes = EmbalagensHEEEPH.agrupar(obterCarrinhoSeguro().map(item => ({
      medida: item.medida, quantidade: Number(item.quantidade || item.quantity || 1)
    })));
    elemento.textContent = pacotes.map((p, i) =>
      `Pacote ${i + 1}: ${p.grandes} grande(s) + ${p.pequenas} pequena(s) — ${p.gramas} g — ${p.length} × ${p.width} × ${p.height} cm${p.estimado ? ' (peso estimado)' : ''}`
    ).join(' | ');
  } catch (erro) { elemento.textContent = erro.message; }
}

function invalidarFrete() {
  consultaFrete += 1;
  if (controleFrete) controleFrete.abort();
  controleFrete = null;
  freteAtual = 0;
  opcaoFreteAtual = null;
  opcoesFrete = [];
  freteEmTeste = false;
  const opcoes = document.getElementById("opcoesFrete");
  if (opcoes) opcoes.replaceChildren();
  const botao = document.getElementById("calcularFreteBtn");
  if (botao) { botao.disabled = false; botao.textContent = "CALCULAR"; }
  atualizarTotalComFrete();
}

function atualizarTotalComFrete() {
  const freteEl = document.getElementById("freteValor");
  const totalEl = document.getElementById("totalValor");
  if (!freteEl || !totalEl) return;
  freteEl.textContent = opcaoFreteAtual
    ? formatarPreco(freteAtual) + (freteEmTeste ? " (teste)" : "")
    : "A confirmar";
  totalEl.textContent = subtotalAtual > 0
    ? formatarPreco(subtotalAtual + freteAtual)
    : "Preço a confirmar";
  const legenda = document.getElementById("legendaTotal");
  if (legenda) legenda.textContent = opcaoFreteAtual
    ? (freteEmTeste ? "Simulação de teste — valor não válido para pagamento." : "Inclui a entrega selecionada. Pedido sujeito à confirmação.")
    : "Frete ainda não incluído.";
}

function exibirOpcoesFrete() {
  const container = document.getElementById("opcoesFrete");
  container.replaceChildren();
  opcoesFrete.forEach(opcao => {
    const label = document.createElement("label");
    label.className = "opcao-frete";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "servicoFrete";
    radio.value = opcao.id;
    radio.addEventListener("change", () => {
      opcaoFreteAtual = opcao;
      freteAtual = opcao.preco;
      atualizarTotalComFrete();
    });
    const detalhes = document.createElement("span");
    const nome = document.createElement("strong");
    nome.textContent = `${opcao.transportadora} — ${opcao.servico}`;
    const prazo = document.createElement("small");
    prazo.textContent = opcao.prazo === null ? "Prazo a confirmar" :
      `${opcao.prazo} ${opcao.prazo === 1 ? "dia útil" : "dias úteis"} após a postagem`;
    detalhes.append(nome, prazo);
    const preco = document.createElement("strong");
    preco.textContent = formatarPreco(opcao.preco);
    label.append(radio, detalhes, preco);
    container.append(label);
  });
}

async function calcularFrete() {
  const input = document.getElementById("cepFrete");
  const mensagem = document.getElementById("mensagemFrete");
  if (!input || !mensagem) return;
  invalidarFrete();
  const cepLimpo = input.value.replace(/\D/g, "");
  input.value = formatarCEP(cepLimpo);
  if (cepLimpo.length !== 8) {
    localStorage.removeItem("cepFreteSalvo");
    mensagem.textContent = "Digite um CEP válido com 8 números.";
    return;
  }
  localStorage.setItem("cepFreteSalvo", input.value);
  const pedido = obterCarrinhoSeguro().map(item => ({
    id: item.id, medida: item.medida, quantidade: Number(item.quantidade || item.quantity || 1)
  }));
  if (!pedido.length) return;
  const consulta = consultaFrete;
  const botao = document.getElementById("calcularFreteBtn");
  controleFrete = new AbortController();
  const controleDestaConsulta = controleFrete;
  const timeout = setTimeout(() => controleDestaConsulta.abort(), 15000);
  botao.disabled = true;
  botao.textContent = "CONSULTANDO…";
  mensagem.textContent = "Consultando opções de entrega…";
  try {
    const resposta = await fetch("/api/frete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cep: cepLimpo, itens: pedido }), signal: controleFrete.signal
    });
    const resultado = await resposta.json();
    if (consulta !== consultaFrete) return;
    if (!resposta.ok) throw new Error(resultado.mensagem || "Não foi possível calcular o frete.");
    opcoesFrete = Array.isArray(resultado.opcoes) ? resultado.opcoes.filter(opcao =>
      opcao && typeof opcao.preco === "number" && Number.isFinite(opcao.preco) && opcao.preco >= 0
    ) : [];
    freteEmTeste = resultado.teste === true;
    mensagem.textContent = opcoesFrete.length
      ? (freteEmTeste ? "Simulação de teste. Escolha uma opção para conferir o total; confirme o frete real pelo WhatsApp." : "Escolha a entrega. Os prazos são estimados após a postagem.")
      : "Não encontramos entrega disponível para este pedido. Consulte pelo WhatsApp.";
    exibirOpcoesFrete();
  } catch (erro) {
    if (consulta !== consultaFrete) return;
    mensagem.textContent = erro.name === "AbortError"
      ? "A consulta demorou. Tente novamente ou confirme o frete pelo WhatsApp."
      : (erro instanceof SyntaxError ? "O cálculo automático ainda não está disponível. Confirme pelo WhatsApp." : erro.message);
  } finally {
    clearTimeout(timeout);
    if (consulta === consultaFrete) {
      controleFrete = null;
      botao.disabled = false;
      botao.textContent = "CALCULAR";
    }
  }
}

document.addEventListener("input", function (event) {
  if (event.target && event.target.id === "cepFrete") {
    event.target.value = formatarCEP(event.target.value);
    invalidarFrete();
    localStorage.removeItem("cepFreteSalvo");
    document.getElementById("mensagemFrete").textContent = "Calcule o frete para este CEP.";
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

  if (opcaoFreteAtual && !freteEmTeste) {
    mensagem += `\nEntrega: ${opcaoFreteAtual.transportadora} — ${opcaoFreteAtual.servico}`;
    mensagem += "\nFrete cotado: " + formatarPreco(freteAtual);
    if (opcaoFreteAtual.prazo !== null) mensagem += `\nPrazo estimado após postagem: ${opcaoFreteAtual.prazo} dia(s) útil(eis)`;
  } else {
    mensagem += "\nFrete: a confirmar pelo WhatsApp";
  }

  if (totalProdutos > 0 && opcaoFreteAtual && !freteEmTeste) {
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

  // O link geral não recebe o valor do pedido. Manter confirmação manual
  // até existir um checkout que valide produtos e frete no servidor.
  abrirWhatsAppPedido();
}

function renderCarrinho() {
  invalidarFrete();
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

  const listaHtml = carrinho.map((item, indice) => {
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
            <button class="quantidade-btn" onclick="diminuirQuantidade(${indice})">-</button>
            <span class="quantidade-numero">${quantidade}</span>
            <button class="quantidade-btn" onclick="aumentarQuantidade(${indice})">+</button>
          </div>

          <button class="remover-btn" onclick="excluirItem(${indice})">REMOVER</button>
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
    : "CONFIRMAR PAGAMENTO";

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
              inputmode="numeric"
              autocomplete="postal-code"
              id="cepFrete"
              class="cep-input"
              placeholder="Digite seu CEP"
              maxlength="9"
            />

            <button type="button" id="calcularFreteBtn" class="botao botao-escuro" onclick="calcularFrete()">
              CALCULAR
            </button>
          </div>

          <p id="resumoPacotes" class="mensagem-frete" aria-live="polite"></p>
          <div id="mensagemFrete" class="mensagem-frete" role="status" aria-live="polite"></div>
          <fieldset id="opcoesFrete" class="opcoes-frete" aria-label="Opções de entrega"></fieldset>
        </div>

        <div class="linha-resumo">
          <span>Frete</span>
          <strong id="freteValor">A combinar</strong>
        </div>

        <div class="linha-resumo total">
          <span>Total</span>
          <strong id="totalValor">${totalGeral > 0 ? formatarPreco(totalGeral) : "preço aqui"}</strong>
        </div>

        <p id="legendaTotal" class="legenda-total">Frete ainda não incluído.</p>

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

  resumoPacotes();
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
  const input = document.getElementById("cepFrete");
  const mensagem = document.getElementById("mensagemFrete");

  if (input && cepSalvo) {
    input.value = formatarCEP(cepSalvo);
  }

  if (mensagem && cepSalvo) {
    mensagem.textContent = "Clique em Calcular para consultar as opções de entrega.";
  }
}
function reaplicarFreteSeJaHouverCEP() {
  atualizarTotalComFrete();
}

window.addEventListener("storage", event => {
  if (event.key === "heeeph_cart" || event.key === "cepFreteSalvo" || event.key === null) renderCarrinho();
});

renderCarrinho();
