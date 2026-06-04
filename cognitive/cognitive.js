(function () {
  const state = {
    nodes: [],
    edges: [],
    lessonIndex: 0,
    linkFrom: null,
    drag: null,
    selectedId: null,
  };

  const $ = (s, r = document) => r.querySelector(s);
  const canvas = $('#cog-canvas');
  const edgesSvg = $('#cog-edges');
  const sqlPreview = $('#cog-sql-preview');
  const feedback = $('#cog-feedback');

  function lesson() {
    return COGNITIVE_LESSONS[state.lessonIndex];
  }

  function renderLesson() {
    const L = lesson();
    $('#cog-lesson-title').textContent = L.title;
    $('#cog-lesson-prompt').textContent = L.prompt;
    $('#cog-lesson-hint').textContent = L.hint;
  }

  function portPos(node, side, index = 0) {
    const el = document.querySelector(`[data-node-id="${node.id}"]`);
    if (!el) return { x: node.x, y: node.y };
    const port = el.querySelector(side === 'out' ? '.cog-port.out' : '.cog-port.in');
    const cr = canvas.getBoundingClientRect();
    const pr = port.getBoundingClientRect();
    return {
      x: pr.left + pr.width / 2 - cr.left,
      y: pr.top + pr.height / 2 - cr.top,
    };
  }

  function edgePath(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.45;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  function drawEdges() {
    const paths = state.edges
      .map((e) => {
        const from = state.nodes.find((n) => n.id === e.from);
        const to = state.nodes.find((n) => n.id === e.to);
        if (!from || !to) return '';
        const a = portPos(from, 'out');
        const b = portPos(to, 'in');
        return `<path d="${edgePath(a.x, a.y, b.x, b.y)}" fill="none" stroke="url(#cog-grad)" stroke-width="2.5" stroke-linecap="round"/>`;
      })
      .join('');
    edgesSvg.innerHTML = `<defs><linearGradient id="cog-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#5ee7ff"/><stop offset="100%" stop-color="#9b7bff"/></linearGradient></defs>${paths}`;
  }

  function renderNodes() {
    canvas.querySelectorAll('.cog-node').forEach((n) => n.remove());
    state.nodes.forEach((node) => {
      const el = document.createElement('div');
      el.className = 'cog-node' + (state.selectedId === node.id ? ' selected' : '');
      el.dataset.nodeId = node.id;
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.style.borderColor = node.color || '#2d3a4f';

      const hasIn = (node.inputs || []).length > 0;
      const hasOut = (node.outputs || []).length > 0;

      el.innerHTML = `
        <div class="cog-node-kind">${node.kind}</div>
        <div class="cog-node-label">${node.label}</div>
        <div class="cog-ports">
          <div>${hasIn ? '<span class="cog-port in" data-port="in" title="Wejście"></span>' : ''}</div>
          <div>${hasOut ? '<span class="cog-port out" data-port="out" title="Wyjście"></span>' : ''}</div>
        </div>
      `;

      el.addEventListener('pointerdown', (ev) => {
        if (ev.target.classList.contains('cog-port')) return;
        state.selectedId = node.id;
        state.drag = { id: node.id, ox: ev.clientX - node.x, oy: ev.clientY - node.y };
        renderNodes();
      });

      el.querySelectorAll('.cog-port').forEach((port) => {
        port.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const side = port.dataset.port;
          if (side === 'out') {
            state.linkFrom = node.id;
            port.classList.add('linking');
          } else if (state.linkFrom && state.linkFrom !== node.id) {
            const exists = state.edges.some((e) => e.from === state.linkFrom && e.to === node.id);
            if (!exists) {
              state.edges.push({
                id: `e-${Date.now()}`,
                from: state.linkFrom,
                to: node.id,
                fromPort: 'out',
                toPort: 'in',
              });
            }
            document.querySelectorAll('.cog-port.linking').forEach((p) => p.classList.remove('linking'));
            state.linkFrom = null;
            updateSql();
            drawEdges();
          }
        });
      });

      canvas.appendChild(el);
    });
    drawEdges();
  }

  function updateSql() {
    const sql = compileGraphToSql({ nodes: state.nodes, edges: state.edges });
    sqlPreview.textContent = sql || '-- połącz bloczki (wyjście → wejście)';
  }

  function buildPalette() {
    const pal = $('#cog-palette');
    const groups = [
      { title: 'Klauzule', items: SQL_KEYWORDS },
      { title: 'Tabele', items: SQL_TABLES.map((t) => ({ ...t, table: true })) },
      { title: 'Kolumny', items: SQL_COLUMNS.map((c) => ({ ...c, kind: 'column' })) },
      { title: 'ON', items: SQL_ON_PRESETS.map((c) => ({ ...c, kind: 'on' })) },
    ];
    pal.innerHTML = '';
    groups.forEach((g) => {
      const sec = document.createElement('div');
      sec.className = 'cog-palette-group';
      sec.innerHTML = `<h2>${g.title}</h2>`;
      g.items.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cog-chip';
        btn.textContent = item.label || item.name || item.kind;
        btn.draggable = true;
        btn.addEventListener('dragstart', (ev) => {
          ev.dataTransfer.setData('application/json', JSON.stringify(item));
        });
        btn.addEventListener('click', () => {
          addNode(item, 80 + Math.random() * 200, 80 + Math.random() * 180);
        });
        sec.appendChild(btn);
      });
      pal.appendChild(sec);
    });
  }

  function addNode(item, x, y) {
    state.nodes.push(createNodeFromPalette(item, x, y));
    renderNodes();
    updateSql();
  }

  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    try {
      const item = JSON.parse(e.dataTransfer.getData('application/json'));
      const r = canvas.getBoundingClientRect();
      addNode(item, e.clientX - r.left - 60, e.clientY - r.top - 20);
    } catch (_) {}
  });

  window.addEventListener('pointermove', (ev) => {
    if (!state.drag) return;
    const n = state.nodes.find((x) => x.id === state.drag.id);
    if (!n) return;
    n.x = ev.clientX - state.drag.ox;
    n.y = ev.clientY - state.drag.oy;
    const el = document.querySelector(`[data-node-id="${n.id}"]`);
    if (el) {
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
    }
    drawEdges();
  });

  window.addEventListener('pointerup', () => {
    state.drag = null;
  });

  $('#cog-check').addEventListener('click', () => {
    const sql = compileGraphToSql({ nodes: state.nodes, edges: state.edges });
    const result = scoreBuiltSql(sql, lesson());
    feedback.className = `cog-feedback ${result.ok ? 'ok' : 'err'}`;
    feedback.textContent = result.message;
    updateSql();
  });

  $('#cog-clear').addEventListener('click', () => {
    state.nodes = [];
    state.edges = [];
    state.linkFrom = null;
    feedback.textContent = '';
    renderNodes();
    updateSql();
  });

  $('#cog-next-lesson').addEventListener('click', () => {
    state.lessonIndex = (state.lessonIndex + 1) % COGNITIVE_LESSONS.length;
    renderLesson();
    $('#cog-clear').click();
  });

  $('#cog-starter').addEventListener('click', () => {
    $('#cog-clear').click();
    addNode({ kind: 'select' }, 120, 100);
    addNode({ kind: 'from' }, 120, 220);
    addNode({ table: true, name: 'uczen', alias: 'u', color: '#3d9cf5' }, 280, 280);
  });

  buildPalette();
  renderLesson();
  renderNodes();
  updateSql();
})();
