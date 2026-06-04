const SQL_TABLES = [
  { name: 'uczen', alias: 'u', color: '#3d9cf5' },
  { name: 'miasto', alias: 'm', color: '#3ecf8e' },
  { name: 'nauczyciel', alias: 'n', color: '#ff9500' },
  { name: 'przedmiot', alias: 'p', color: '#9b7bff' },
  { name: 'ocena', alias: 'o', color: '#f07178' },
];

const SQL_KEYWORDS = [
  { kind: 'select', label: 'SELECT', outputs: ['out'] },
  { kind: 'from', label: 'FROM', inputs: ['in'], outputs: ['out'] },
  { kind: 'join', label: 'JOIN', inputs: ['in'], outputs: ['out'] },
  { kind: 'on', label: 'ON', inputs: ['in'], outputs: ['out'] },
  { kind: 'where', label: 'WHERE', inputs: ['in'], outputs: ['out'] },
  { kind: 'groupby', label: 'GROUP BY', inputs: ['in'], outputs: ['out'] },
  { kind: 'having', label: 'HAVING', inputs: ['in'], outputs: ['out'] },
  { kind: 'orderby', label: 'ORDER BY', inputs: ['in'], outputs: ['out'] },
];

const SQL_COLUMNS = [
  { expr: 'u.imie', label: 'imie ucznia' },
  { expr: 'u.nazwisko', label: 'nazwisko ucznia' },
  { expr: 'm.nazwa', label: 'miasto' },
  { expr: 'n.imie', label: 'imie nauczyciela' },
  { expr: 'n.nazwisko', label: 'nazwisko nauczyciela' },
  { expr: 'n.pensja', label: 'pensja' },
  { expr: 'p.nazwa', label: 'przedmiot' },
  { expr: 'o.wartosc', label: 'ocena' },
  { expr: 'ROUND(AVG(o.wartosc), 2)', label: 'średnia (ROUND)' },
];

const SQL_ON_PRESETS = [
  { expr: 'm.id_miasto = u.id_miasto', label: 'miasto ↔ uczeń' },
  { expr: 'w.id_nauczyciel = u.id_wychowawca', label: 'wychowawca ↔ uczeń' },
  { expr: 'o.id_uczen = u.id_uczen', label: 'ocena ↔ uczeń' },
  { expr: 'p.id_przedmiot = o.id_przedmiot', label: 'przedmiot ↔ ocena' },
];

const COGNITIVE_LESSONS = [
  {
    id: 'lesson-join-cities',
    title: 'Uczniowie i miasta',
    prompt: 'Połącz bloczki: SELECT kolumn, FROM uczen, JOIN miasto, ON warunek łączenia.',
    hint: 'Kolejność: SELECT → FROM (uczen) → JOIN (miasto) → ON → kolumny w SELECT.',
    checkKeywords: ['select', 'uczen', 'miasto', 'join', 'id_miasto'],
  },
  {
    id: 'lesson-where-salary',
    title: 'Nauczyciele — pensja',
    prompt: 'Złóż zapytanie: SELECT imię i nazwisko, FROM nauczyciel, WHERE pensja >= 2000.',
    hint: 'Dodaj blok WHERE z warunkiem na pensji (wpisz w etykiecie bloku).',
    checkKeywords: ['select', 'nauczyciel', 'where', 'pensja'],
  },
  {
    id: 'lesson-group-avg',
    title: 'Średnia ocen',
    prompt: 'SELECT średnia ROUND, FROM ocena + uczen, GROUP BY uczeń.',
    hint: 'Użyj kolumny średnia (ROUND) i GROUP BY po u.imie, u.nazwisko.',
    checkKeywords: ['select', 'avg', 'group by', 'uczen', 'ocena', 'round'],
  },
];

function blockSpec(kind) {
  return SQL_KEYWORDS.find((k) => k.kind === kind) || { kind, label: kind, inputs: ['in'], outputs: ['out'] };
}

function createNodeFromPalette(item, x, y) {
  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (item.table) {
    return {
      id,
      kind: 'table',
      label: `${item.name} ${item.alias}`,
      x,
      y,
      data: { table: item.name, alias: item.alias },
      color: item.color,
      inputs: [],
      outputs: ['out'],
    };
  }
  if (item.expr) {
    return {
      id,
      kind: item.kind || 'column',
      label: item.label,
      x,
      y,
      data: { expr: item.expr },
      color: '#5ee7ff',
      inputs: [],
      outputs: ['out'],
    };
  }
  const spec = blockSpec(item.kind);
  return {
    id,
    kind: item.kind,
    label: spec.label,
    x,
    y,
    data: { extra: item.kind === 'where' ? 'pensja >= 2000' : '' },
    color: '#9b7bff',
    inputs: spec.inputs || [],
    outputs: spec.outputs || ['out'],
  };
}
