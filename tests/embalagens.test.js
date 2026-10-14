const test = require('node:test');
const assert = require('node:assert/strict');
const { agrupar, tabela } = require('../js/embalagens.js');

test('todas as pesagens confirmadas são reproduzidas em um único pacote', () => {
  for (const modelo of tabela) {
    const itens = [];
    if (modelo.grandes) itens.push({ medida: '20x28cm', quantidade: modelo.grandes });
    if (modelo.pequenas) itens.push({ medida: '15x10cm', quantidade: modelo.pequenas });
    assert.deepEqual(agrupar(itens), [{ ...modelo }]);
  }
});

test('não perde placas nem ultrapassa as capacidades em todos os pedidos até 50 itens', () => {
  for (let g = 0; g <= 50; g++) for (let p = 0; p + g <= 50; p++) {
    if (!g && !p) continue;
    const itens = [];
    if (g) itens.push({ medida: '28x20cm', quantidade: g });
    if (p) itens.push({ medida: '10x15cm', quantidade: p });
    const pacotes = agrupar(itens);
    assert.equal(pacotes.reduce((n, v) => n + v.grandes, 0), g);
    assert.equal(pacotes.reduce((n, v) => n + v.pequenas, 0), p);
    assert.ok(pacotes.every(v => tabela.some(m => m.grandes === v.grandes && m.pequenas === v.pequenas)));
  }
});

test('pedidos maiores usam vários pacotes; 1G+3P não inventa uma combinação não medida', () => {
  assert.equal(agrupar([{ medida: '20x28', quantidade: 6 }]).length, 2);
  assert.equal(agrupar([{ medida: '20x28', quantidade: 1 }, { medida: '10x15', quantidade: 3 }]).length, 2);
});

