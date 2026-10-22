const c = require('./checkout');
const normalizar = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const recusado = p => ['failed','canceled','cancelled','expired','rejected','error'].includes(p.pagamento?.status);

module.exports = async function listar(b) {
  const limite = b.limite === undefined ? 20 : b.limite;
  const cursor = b.cursor || null, busca = b.busca === undefined ? '' : b.busca;
  const filtro = b.filtro || 'todos';
  if (!Number.isInteger(limite) || limite < 1 || limite > 50 ||
      (cursor !== null && (typeof cursor !== 'string' || !/^[a-f0-9]{32}$/.test(cursor))) ||
      typeof busca !== 'string' || busca.length > 100 ||
      !['todos','aprovados','pendentes','recusados'].includes(filtro)) {
    throw Object.assign(new Error('Parâmetros inválidos.'), {status:400});
  }
  const termo = normalizar(busca.trim()), indice = c.prefixo + 'lista';
  const exato = /^[a-f0-9]{32}$/.test(termo);
  let inicio = 0;
  if (cursor) {
    const rank = await c.redis(['ZREVRANK',indice,cursor]);
    if (rank === null) throw Object.assign(new Error('Atualize a pesquisa.'), {status:409});
    inicio = rank + 1;
  }
  // Limita trabalho por requisição; o cursor permite continuar pesquisas longas.
  const ids = exato ? (cursor ? [] : [termo]) : await c.redis(['ZREVRANGE',indice,inicio,inicio+200]);
  const pedidos = [];
  let examinados = 0, ultimo = null;
  for (let offset=0; offset<Math.min(ids.length,200) && pedidos.length<limite; offset+=25) {
    const lote = ids.slice(offset,Math.min(offset+25,200));
    const valores = await c.redis(['MGET',...lote.flatMap(id=>[c.prefixo+id,c.prefixo+'gestao:'+id])]);
    for (let i=0;i<lote.length && pedidos.length<limite;i++) {
      ultimo=lote[i]; examinados++;
      if (!valores[i*2]) continue;
      const p=JSON.parse(valores[i*2]), g=valores[i*2+1]?JSON.parse(valores[i*2+1]):{status:'Recebido'};
      if (p.id!==ultimo || (p.ambiente||'teste')!==c.ambiente().nome || g.excluido) continue;
      if (filtro==='aprovados'&&!p.pagamento?.aprovado || filtro==='recusados'&&!recusado(p) ||
          filtro==='pendentes'&&(p.pagamento?.aprovado||recusado(p))) continue;
      const texto=[p.id,p.cliente?.nome,p.cliente?.email,...(p.itens||[]).map(i=>i.nome)].join(' ');
      if (termo&&!normalizar(texto).includes(termo)) continue;
      pedidos.push({p,g});
    }
  }
  return {pedidos,limite,examinados,cursorProximo:!exato&&examinados<ids.length?ultimo:null};
};
