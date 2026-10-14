(function (root) {
  'use strict';
  // Pesagens de 13/10/2026. Incluem embalagem e cantoneiras.
  // Peso cadastrado: +5 g estimados de etiqueta/fita e arredondamento para cima.
  const tabela = [
    [1, 0, 180, 30, 25, 1], [2, 0, 330, 30, 25, 2], [3, 0, 490, 30, 25, 3],
    [0, 1, 50, 15, 12, 1], [0, 2, 90, 15, 12, 1], [0, 3, 130, 15, 12, 2],
    [1, 1, 230, 30, 25, 2], [1, 2, 270, 30, 25, 3],
    [2, 1, 370, 30, 25, 3], [2, 2, 410, 30, 25, 3],
    // 2 G + 4 P: capacidade/altura confirmadas; peso estimado (404+80+5 g).
    [2, 4, 490, 30, 25, 3]
  ].map(([grandes, pequenas, gramas, length, width, height]) =>
    Object.freeze({ grandes, pequenas, gramas, length, width, height, estimado: grandes === 2 && pequenas === 4 }));

  function tamanho(medida) {
    const texto = String(medida || '').toLowerCase().replace(/\s/g, '').replace(/×/g, 'x');
    if (/^(20x28|28x20)(cm)?$/.test(texto)) return 'G';
    if (/^(10x15|15x10)(cm)?$/.test(texto)) return 'P';
    throw new Error('Escolha o tamanho das placas na coleção antes de calcular o frete. Outros tamanhos precisam de confirmação pelo WhatsApp.');
  }

  function agrupar(itens) {
    let grandes = 0, pequenas = 0;
    for (const item of itens) {
      if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 50) throw new Error('Confira as quantidades do carrinho.');
      if (tamanho(item.medida) === 'G') grandes += item.quantidade;
      else pequenas += item.quantidade;
    }
    if (!grandes && !pequenas || grandes + pequenas > 50) throw new Error('Para este pedido, confirme o frete pelo WhatsApp.');
    // Minimiza número de pacotes e depois o volume total. Nunca inventa capacidade.
    const memo = new Map();
    function resolver(g, p) {
      if (!g && !p) return { pacotes: [], volume: 0 };
      const chave = g + ':' + p;
      if (memo.has(chave)) return memo.get(chave);
      let melhor;
      for (const modelo of tabela) {
        if (modelo.grandes > g || modelo.pequenas > p) continue;
        const resto = resolver(g - modelo.grandes, p - modelo.pequenas);
        const atual = { pacotes: [modelo, ...resto.pacotes], volume: resto.volume + modelo.length * modelo.width * modelo.height };
        if (!melhor || atual.pacotes.length < melhor.pacotes.length ||
            atual.pacotes.length === melhor.pacotes.length && atual.volume < melhor.volume) melhor = atual;
      }
      memo.set(chave, melhor);
      return melhor;
    }
    return resolver(grandes, pequenas).pacotes.map(p => ({ ...p }));
  }
  const api = { agrupar, tamanho, tabela: Object.freeze(tabela), precos: Object.freeze({ G: 24.90, P: 12.90 }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EmbalagensHEEEPH = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

