function normalizeSql(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compileGraphToSql(graph) {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const childrenOf = (id) =>
    edges.filter((e) => e.to === id).map((e) => byId.get(e.from)).filter(Boolean);

  const selectNode = nodes.find((n) => n.kind === 'select');
  if (!selectNode) return '';

  const chain = [];
  let cursor = selectNode;
  const seen = new Set();
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    chain.push(cursor);
    const nextEdge = edges.find((e) => e.from === cursor.id && byId.get(e.to)?.kind !== 'column');
    cursor = nextEdge ? byId.get(nextEdge.to) : null;
  }

  const cols = edges
    .filter((e) => e.to === selectNode.id)
    .map((e) => byId.get(e.from))
    .filter((n) => n && (n.kind === 'column' || n.data?.expr))
    .map((n) => n.data?.expr || n.label);

  const lines = [];
  if (cols.length) {
    lines.push(`SELECT ${cols.join(', ')}`);
  } else {
    lines.push('SELECT *');
  }

  const fromNode = nodes.find((n) => n.kind === 'from');
  const tableFor = (nodeId) => {
    const t = childrenOf(nodeId).find((n) => n.kind === 'table');
    return t ? `${t.data.table} ${t.data.alias}` : null;
  };

  if (fromNode) {
    const tbl = tableFor(fromNode.id);
    if (tbl) lines.push(`FROM ${tbl}`);
  }

  nodes
    .filter((n) => n.kind === 'join')
    .forEach((jn) => {
      const tbl = tableFor(jn.id);
      if (tbl) lines.push(`JOIN ${tbl}`);
      const onNode = childrenOf(jn.id).find((n) => n.kind === 'on');
      if (onNode) {
        const onChild = childrenOf(onNode.id).find((n) => n.data?.expr);
        if (onChild?.data?.expr) lines.push(`ON ${onChild.data.expr}`);
      }
    });

  const whereNode = nodes.find((n) => n.kind === 'where');
  if (whereNode?.data?.extra) lines.push(`WHERE ${whereNode.data.extra}`);

  const groupNode = nodes.find((n) => n.kind === 'groupby');
  if (groupNode?.data?.extra) lines.push(`GROUP BY ${groupNode.data.extra}`);

  const havingNode = nodes.find((n) => n.kind === 'having');
  if (havingNode?.data?.extra) lines.push(`HAVING ${havingNode.data.extra}`);

  const orderNode = nodes.find((n) => n.kind === 'orderby');
  if (orderNode?.data?.extra) lines.push(`ORDER BY ${orderNode.data.extra}`);

  return lines.join('\n') + ';';
}

function scoreBuiltSql(sql, lesson) {
  const n = normalizeSql(sql);
  if (!n) return { ok: false, message: 'Połącz bloczki — zapytanie jest puste.' };
  const keys = (lesson.checkKeywords || []).map((k) => k.toLowerCase());
  const missing = keys.filter((k) => !n.includes(k));
  if (missing.length > keys.length * 0.4) {
    return {
      ok: false,
      message: `Brakuje elementów: ${missing.slice(0, 4).join(', ')}`,
    };
  }
  return { ok: true, message: 'Dobre połączenie — porównaj z podglądem SQL.' };
}
