const { getTodosOsProdutos } = require('../produtos.js');
const config = require('../config/frete.json');

class ErroFrete extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function precoNumero(valor) {
  if (typeof valor === 'number') return valor;
  const texto = String(valor || '').replace(/[^\d,.-]/g, '');
  return Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
}

function montarCotacao(body, catalogo = getTodosOsProdutos(), configuracao = config) {
  if (!body || typeof body.cep !== 'string' || !/^\d{8}$/.test(body.cep)) {
    throw new ErroFrete('Digite um CEP válido com 8 números.');
  }
  if (!Array.isArray(body.itens) || !body.itens.length || body.itens.length > 50) {
    throw new ErroFrete('Confira os itens do carrinho antes de calcular o frete.');
  }
  let quantidadeTotal = 0;
  const ids = new Set();
  const products = body.itens.map(item => {
    if (!item || typeof item.id !== 'string' || ids.has(item.id) ||
        !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 50) {
      throw new ErroFrete('Confira as quantidades do carrinho.');
    }
    ids.add(item.id);
    quantidadeTotal += item.quantidade;
    const encontrados = catalogo.filter(produto => produto.id === item.id);
    if (encontrados.length !== 1) {
      throw new ErroFrete('Este pedido precisa de confirmação pelo WhatsApp.', 422);
    }
    const produto = encontrados[0];
    const embalagem = configuracao.embalagensPorProduto[item.id];
    const preco = precoNumero(produto.preco);
    if (!embalagem || !['width', 'height', 'length', 'weight'].every(campo =>
      typeof embalagem[campo] === 'number' && Number.isFinite(embalagem[campo]) && embalagem[campo] > 0
    ) || !Number.isFinite(preco) || preco <= 0) {
      throw new ErroFrete('O frete deste pedido ainda precisa ser confirmado pelo WhatsApp.', 422);
    }
    return {
      id: item.id, width: embalagem.width, height: embalagem.height,
      length: embalagem.length, weight: embalagem.weight,
      insurance_value: Math.round(preco * 100) / 100, quantity: item.quantidade
    };
  });
  if (quantidadeTotal > 50) throw new ErroFrete('Para pedidos maiores, consulte o frete pelo WhatsApp.');
  return {
    from: { postal_code: configuracao.cepOrigem }, to: { postal_code: body.cep },
    products, options: { receipt: false, own_hand: false }
  };
}

function normalizarOpcoes(resultado) {
  if (!Array.isArray(resultado)) throw new ErroFrete('Não foi possível consultar o frete agora. Tente novamente.', 502);
  return resultado.filter(item => item && !item.error).map(item => {
    const precoBruto = item.custom_price ?? item.price;
    const prazoBruto = item.custom_delivery_time ?? item.delivery_time;
    const preco = precoBruto === null || precoBruto === '' ? NaN : Number(precoBruto);
    const prazo = prazoBruto === null || prazoBruto === '' ? NaN : Number(prazoBruto);
    return {
      id: String(item.id ?? ''), transportadora: String(item.company?.name || ''),
      servico: String(item.name || ''), preco,
      prazo: Number.isInteger(prazo) && prazo >= 0 ? prazo : null
    };
  }).filter(item => item.id && item.servico && Number.isFinite(item.preco) && item.preco >= 0)
    .sort((a, b) => a.preco - b.preco);
}

module.exports = { montarCotacao, normalizarOpcoes, ErroFrete };
