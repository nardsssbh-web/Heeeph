const embalagens = require('../js/embalagens.js');
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
  const ids = new Set();
  const itens = body.itens.map(item => {
    if (!item || typeof item.id !== 'string' || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 50) {
      throw new ErroFrete('Confira as quantidades do carrinho.');
    }
    const encontrados = catalogo.filter(produto => produto.id === item.id);
    if (encontrados.length !== 1) throw new ErroFrete('Este pedido precisa de confirmação pelo WhatsApp.', 422);
    let tipo;
    try { tipo = embalagens.tamanho(item.medida); }
    catch (erro) { throw new ErroFrete(erro.message, 422); }
    const chave = item.id + ':' + tipo;
    if (ids.has(chave)) throw new ErroFrete('Confira as quantidades do carrinho.');
    ids.add(chave);
    const produto = encontrados[0];
    // A galeria oferece estes dois tamanhos com preços fixos. Nunca usar preço enviado pelo cliente.
    if (!['vertical', 'horizontal'].includes(produto.orientacao)) throw new ErroFrete('Confirme este produto pelo WhatsApp.', 422);
    const dimensoes = String(item.medida).toLowerCase().replace(/\s/g, '').replace(/×/g, 'x').replace(/cm$/, '');
    const permitidas = produto.orientacao === 'vertical' ? ['10x15', '20x28'] : ['15x10', '28x20'];
    if (!permitidas.includes(dimensoes)) throw new ErroFrete('Confira o tamanho escolhido para esta placa.', 422);
    return { ...item, tipo, preco: embalagens.precos[tipo] };
  });
  let pacotes;
  try { pacotes = embalagens.agrupar(itens); }
  catch (erro) { throw new ErroFrete(erro.message, 422); }
  const filas = { G: [], P: [] };
  for (const item of itens) for (let i = 0; i < item.quantidade; i++) filas[item.tipo].push(item.preco);
  const volumes = pacotes.map(pacote => {
    let centavos = 0;
    for (let i = 0; i < pacote.grandes; i++) centavos += Math.round(filas.G.shift() * 100);
    for (let i = 0; i < pacote.pequenas; i++) centavos += Math.round(filas.P.shift() * 100);
    return { width: pacote.width, length: pacote.length, height: pacote.height,
      weight: pacote.gramas / 1000, insurance: centavos / 100 };
  });
  return { from: { postal_code: configuracao.cepOrigem }, to: { postal_code: body.cep },
    volumes, options: { receipt: false, own_hand: false } };
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
