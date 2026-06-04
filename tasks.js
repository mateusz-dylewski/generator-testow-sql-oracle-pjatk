const SCHEMA_DDL = `-- Oracle DDL
-- miasto(id_miasto, nazwa)
-- nauczyciel(id_nauczyciel, imie, nazwisko, pensja)
-- uczen(id_uczen, imie, nazwisko, id_miasto, id_wychowawca)
-- przedmiot(id_przedmiot, nazwa)
-- ocena(id_ocena, wartosc, id_uczen, id_przedmiot, id_nauczyciel)`;

const RANDOM_NAMES = [
  { imie: 'Szymon', nazwisko: 'Czeresnia' },
  { imie: 'Jan', nazwisko: 'Malinowski' },
  { imie: 'Kasia', nazwisko: 'Zielińska' },
  { imie: 'Anna', nazwisko: 'Kowalska' },
];

const RANDOM_SUBJECTS = ['Matematyka', 'Historia', 'Informatyka', 'Fizyka', 'Chemia'];
const RANDOM_CITIES = ['Warszawa', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań'];
const RANDOM_SALARIES = [1500, 2000, 2500, 3000, 3500, 4000];
const RANDOM_GRADES = [2, 2.5, 3, 3.5, 4, 4.5];
const RANDOM_VALUES = [4, 5, 6];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildTaskTemplates() {
  return [
    {
      id: 'teachers-salary',
      topic: 'SELECT + WHERE',
      difficulty: 'easy',
      oracleOnly: true,
      build() {
        const min = pick(RANDOM_SALARIES);
        return {
          prompt: `Wypisz wszystkich nauczycieli (imię i nazwisko), którzy zarabiają co najmniej ${min}.`,
          hints: [
            'Tabela: nauczyciel. Warunek na kolumnie pensja.',
            'Użyj WHERE pensja >= …',
          ],
          solution: `SELECT n.imie, n.nazwisko, n.pensja
FROM nauczyciel n
WHERE n.pensja >= ${min}
ORDER BY n.pensja DESC;`,
          checkKeywords: ['nauczyciel', 'pensja', 'where', '>=', `${min}`],
        };
      },
    },
    {
      id: 'students-cities',
      topic: 'JOIN',
      difficulty: 'easy',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Wypisz wszystkich uczniów (imię i nazwisko) wraz z nazwami miast, z których pochodzą.',
          hints: [
            'Połącz uczen z miasto po id_miasto.',
            'SELECT z obu tabel — imie, nazwisko, nazwa miasta.',
          ],
          solution: `SELECT u.imie, u.nazwisko, m.nazwa AS miasto
FROM uczen u
JOIN miasto m ON m.id_miasto = u.id_miasto;`,
          checkKeywords: ['uczen', 'miasto', 'join', 'id_miasto'],
        };
      },
    },
    {
      id: 'students-homeroom',
      topic: 'JOIN (alias)',
      difficulty: 'easy',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Wypisz wszystkich uczniów (imię i nazwisko) wraz z wychowawcą (imię i nazwisko nauczyciela).',
          hints: [
            'uczen.id_wychowawca → nauczyciel.id_nauczyciel',
            'Ten sam nauczyciel może być wychowawcą wielu uczniów — to normalne.',
          ],
          solution: `SELECT u.imie, u.nazwisko,
       w.imie AS wych_imie, w.nazwisko AS wych_nazwisko
FROM uczen u
JOIN nauczyciel w ON w.id_nauczyciel = u.id_wychowawca;`,
          checkKeywords: ['uczen', 'nauczyciel', 'join', 'id_wychowawca'],
        };
      },
    },

    {
      id: 'grades-detail',
      topic: 'JOIN wielokrotny',
      difficulty: 'medium',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Dla każdej oceny wypisz ucznia (imię i nazwisko), który ją dostał, oraz przedmiot (nazwa), z którego została wystawiona.',
          hints: [
            'Start od tabeli ocena.',
            'Dołącz uczen i przedmiot.',
          ],
          solution: `SELECT u.imie, u.nazwisko, p.nazwa AS przedmiot, o.wartosc
FROM ocena o
JOIN uczen u ON u.id_uczen = o.id_uczen
JOIN przedmiot p ON p.id_przedmiot = o.id_przedmiot;`,
          checkKeywords: ['ocena', 'uczen', 'przedmiot', 'join'],
        };
      },
    },
    {
      id: 'avg-per-student',
      topic: 'GROUP BY + ROUND',
      difficulty: 'medium',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Dla każdego ucznia (imię i nazwisko) wypisz średnią jego ocen. Zaokrąglij do 2 miejsc po przecinku.',
          hints: [
            'AVG(o.wartosc) z GROUP BY ucznia.',
            'Oracle: ROUND(…, 2)',
          ],
          solution: `SELECT u.imie, u.nazwisko,
       ROUND(AVG(o.wartosc), 2) AS srednia
FROM uczen u
JOIN ocena o ON o.id_uczen = u.id_uczen
GROUP BY u.id_uczen, u.imie, u.nazwisko;`,
          checkKeywords: ['avg', 'group by', 'round', 'uczen', 'ocena'],
        };
      },
    },
    {
      id: 'avg-per-city',
      topic: 'GROUP BY + JOIN',
      difficulty: 'medium',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Dla każdego miasta (nazwa) wypisz średnią ocen uczniów z tego miasta.',
          hints: [
            'Łańcuch: miasto → uczen → ocena.',
            'Grupuj po nazwie miasta (lub id_miasto).',
          ],
          solution: `SELECT m.nazwa AS miasto,
       ROUND(AVG(o.wartosc), 2) AS srednia
FROM miasto m
JOIN uczen u ON u.id_miasto = m.id_miasto
JOIN ocena o ON o.id_uczen = u.id_uczen
GROUP BY m.id_miasto, m.nazwa;`,
          checkKeywords: ['miasto', 'avg', 'group by', 'uczen', 'ocena'],
        };
      },
    },
    {
      id: 'math-avg-below',
      topic: 'HAVING',
      difficulty: 'medium',
      oracleOnly: true,
      build() {
        const subj = pick(RANDOM_SUBJECTS);
        const threshold = pick(RANDOM_GRADES);
        return {
          prompt: `Wypisz uczniów (imię i nazwisko), których średnia ocen z przedmiotu „${subj}" jest niższa niż ${threshold}.`,
          hints: [
            'Filtruj przedmiot w WHERE (nazwa = …).',
            'Średnia per uczeń → GROUP BY + HAVING AVG(…) < …',
          ],
          solution: `SELECT u.imie, u.nazwisko
FROM uczen u
JOIN ocena o ON o.id_uczen = u.id_uczen
JOIN przedmiot p ON p.id_przedmiot = o.id_przedmiot
WHERE p.nazwa = '${subj}'
GROUP BY u.id_uczen, u.imie, u.nazwisko
HAVING AVG(o.wartosc) < ${threshold};`,
          checkKeywords: ['having', 'avg', 'group by', subj.toLowerCase(), 'przedmiot'],
        };
      },
    },

    {
      id: 'same-city-as',
      topic: 'Podzapytanie',
      difficulty: 'hard',
      oracleOnly: true,
      build() {
        const person = pick(RANDOM_NAMES);
        const full = `${person.imie} ${person.nazwisko}`;
        return {
          prompt: `Wypisz uczniów (imię i nazwisko) pochodzących z tego samego miasta co uczeń „${full}".`,
          hints: [
            'Znajdź id_miasto wybranego ucznia (podzapytanie).',
            'Albo: JOIN uczen z samym sobą po id_miasto.',
          ],
          solution: `SELECT u2.imie, u2.nazwisko
FROM uczen u2
WHERE u2.id_miasto = (
  SELECT u1.id_miasto
  FROM uczen u1
  WHERE u1.imie = '${person.imie}' AND u1.nazwisko = '${person.nazwisko}'
)
AND NOT (u2.imie = '${person.imie}' AND u2.nazwisko = '${person.nazwisko}');`,
          checkKeywords: ['select', 'id_miasto', 'where', person.imie.toLowerCase()],
        };
      },
    },
    {
      id: 'teacher-most-grades',
      topic: 'TOP-N / agregacja',
      difficulty: 'hard',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Wypisz imię i nazwisko nauczyciela, który wystawił najwięcej ocen.',
          hints: [
            'COUNT(*) po id_nauczyciel, ORDER BY COUNT DESC.',
            'Oracle 12c+: FETCH FIRST 1 ROW ONLY',
          ],
          solution: `SELECT n.imie, n.nazwisko, COUNT(*) AS liczba_ocen
FROM nauczyciel n
JOIN ocena o ON o.id_nauczyciel = n.id_nauczyciel
GROUP BY n.id_nauczyciel, n.imie, n.nazwisko
ORDER BY COUNT(*) DESC
FETCH FIRST 1 ROW ONLY;`,
          checkKeywords: ['count', 'group by', 'order by', 'nauczyciel', 'ocena'],
          oracleBonus: ['fetch first', 'rownum'],
        };
      },
    },
    {
      id: 'subject-most-fives',
      topic: 'HAVING + filtr',
      difficulty: 'hard',
      oracleOnly: true,
      build() {
        const val = pick(RANDOM_VALUES);
        return {
          prompt: `Wypisz nazwę przedmiotu, na którym wystawiono najwięcej ocen o wartości ${val}.`,
          hints: [
            `WHERE o.wartosc = ${val} przed GROUP BY.`,
            'ORDER BY COUNT(*) DESC + jeden wiersz wyniku.',
          ],
          solution: `SELECT p.nazwa, COUNT(*) AS ile
FROM przedmiot p
JOIN ocena o ON o.id_przedmiot = p.id_przedmiot
WHERE o.wartosc = ${val}
GROUP BY p.id_przedmiot, p.nazwa
ORDER BY COUNT(*) DESC
FETCH FIRST 1 ROW ONLY;`,
          checkKeywords: ['wartosc', `${val}`, 'group by', 'przedmiot', 'count'],
        };
      },
    },
    {
      id: 'students-no-grades',
      topic: 'LEFT JOIN / NOT EXISTS',
      difficulty: 'hard',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Wypisz uczniów (imię i nazwisko), którzy nie mają żadnej wystawionej oceny.',
          hints: [
            'LEFT JOIN ocena … WHERE o.id_ocena IS NULL',
            'Lub: NOT EXISTS (SELECT 1 FROM ocena …)',
          ],
          solution: `SELECT u.imie, u.nazwisko
FROM uczen u
WHERE NOT EXISTS (
  SELECT 1 FROM ocena o WHERE o.id_uczen = u.id_uczen
);`,
          checkKeywords: ['not exists', 'uczen', 'ocena'],
        };
      },
    },

    {
      id: 'oracle-nvl-avg',
      topic: 'NVL',
      difficulty: 'expert',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Dla każdego ucznia wypisz średnią ocen; jeśli uczeń nie ma ocen, pokaż 0 (użyj NVL).',
          hints: [
            'LEFT JOIN na oceny, potem AVG — może dać NULL.',
            'NVL(ROUND(AVG(…), 2), 0)',
          ],
          solution: `SELECT u.imie, u.nazwisko,
       NVL(ROUND(AVG(o.wartosc), 2), 0) AS srednia
FROM uczen u
LEFT JOIN ocena o ON o.id_uczen = u.id_uczen
GROUP BY u.id_uczen, u.imie, u.nazwisko;`,
          checkKeywords: ['nvl', 'left join', 'avg', 'uczen'],
        };
      },
    },
    {
      id: 'oracle-rownum-top-teachers',
      topic: 'ROWNUM',
      difficulty: 'expert',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Wypisz 3 nauczycieli z najwyższą pensją (użyj ROWNUM w podzapytaniu — styl starszego Oracle).',
          hints: [
            'Najpierw posortuj w podzapytaniu, potem ROWNUM <= 3 na zewnątrz.',
            'Klasyczny wzorzec: SELECT * FROM (SELECT … ORDER BY …) WHERE ROWNUM <= 3',
          ],
          solution: `SELECT imie, nazwisko, pensja
FROM (
  SELECT n.imie, n.nazwisko, n.pensja
  FROM nauczyciel n
  ORDER BY n.pensja DESC
)
WHERE ROWNUM <= 3;`,
          checkKeywords: ['rownum', 'order by', 'pensja', 'nauczyciel'],
        };
      },
    },
    {
      id: 'oracle-concat-report',
      topic: '|| konkatenacja',
      difficulty: 'expert',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Wypisz jeden tekstowy opis każdej oceny w formacie: „Uczeń: Imie Nazwisko, Przedmiot: X, Ocena: Y" (łącz tekst operatorem ||).',
          hints: [
            'JOIN uczen + przedmiot + ocena.',
            "Literały w pojedynczych cudzysłowach, pola przez ||",
          ],
          solution: `SELECT 'Uczeń: ' || u.imie || ' ' || u.nazwisko
       || ', Przedmiot: ' || p.nazwa
       || ', Ocena: ' || o.wartosc AS opis
FROM ocena o
JOIN uczen u ON u.id_uczen = o.id_uczen
JOIN przedmiot p ON p.id_przedmiot = o.id_przedmiot;`,
          checkKeywords: ['||', 'ocena', 'uczen', 'przedmiot'],
        };
      },
    },
    {
      id: 'oracle-fetch-pagination',
      topic: 'FETCH OFFSET',
      difficulty: 'expert',
      oracleOnly: true,
      build() {
        return {
          prompt: 'Wypisz uczniów posortowanych alfabetycznie po nazwisku — pomiń pierwszych 2, zwróć następnych 3 (OFFSET/FETCH).',
          hints: [
            'ORDER BY nazwisko, imie',
            'OFFSET 2 ROWS FETCH NEXT 3 ROWS ONLY',
          ],
          solution: `SELECT u.imie, u.nazwisko
FROM uczen u
ORDER BY u.nazwisko, u.imie
OFFSET 2 ROWS FETCH NEXT 3 ROWS ONLY;`,
          checkKeywords: ['offset', 'fetch', 'order by', 'nazwisko'],
        };
      },
    },
    {
      id: 'oracle-city-having-count',
      topic: 'HAVING COUNT',
      difficulty: 'expert',
      oracleOnly: true,
      build() {
        const city = pick(RANDOM_CITIES);
        const n = pick([2, 3, 4]);
        return {
          prompt: `Wypisz miasta, w których mieszka co najmniej ${n} uczniów, oraz liczbę uczniów w każdym z nich.`,
          hints: [
            'GROUP BY miasto.nazwa',
            `HAVING COUNT(u.id_uczen) >= ${n}`,
          ],
          solution: `SELECT m.nazwa, COUNT(u.id_uczen) AS liczba_uczniow
FROM miasto m
JOIN uczen u ON u.id_miasto = m.id_miasto
GROUP BY m.id_miasto, m.nazwa
HAVING COUNT(u.id_uczen) >= ${n};`,
          checkKeywords: ['having', 'count', 'group by', 'miasto', 'uczen'],
        };
      },
    },
  ];
}

const TASK_TEMPLATES = buildTaskTemplates();

const DIFFICULTY_LEVELS = { easy: 1, medium: 2, hard: 3, expert: 4 };

function getTasksForDifficulty(difficulty) {
  const max = DIFFICULTY_LEVELS[difficulty] || 2;
  return TASK_TEMPLATES.filter((t) => {
    const taskLevel = DIFFICULTY_LEVELS[t.difficulty] || 2;
    return taskLevel <= max;
  });
}

const LEARN_STOPWORDS = new Set([
  'as', 'on', 'and', 'or', 'by', 'is', 'in', 'to', 'the', 'not', 'null', 'from', 'join', 'inner', 'left', 'right',
]);

function deriveLearnSteps(solution, hints = []) {
  const steps = [];

  hints.forEach((hint, i) => {
    steps.push({
      id: `hint-${i}`,
      kind: 'hint',
      instruction: hint,
      lead: i === 0 ? 'Podpowiedź — zapoznaj się z treścią:' : 'Kolejna podpowiedź:',
    });
  });

  const lines = solution
    .replace(/;[\s]*$/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  lines.forEach((line, i) => {
    steps.push({
      id: `line-${i}`,
      kind: 'write',
      instruction: 'Wpisz w edytorze (dopisz do poprzednich linii):',
      codeLine: line,
      tokens: extractLearnTokens(line),
    });
  });

  steps.push({
    id: 'finish',
    kind: 'finish',
    instruction: 'Sprawdź całe zapytanie. Upewnij się, że na końcu jest średnik (;).',
    tokens: ['select', 'from'],
  });

  return steps;
}

function extractLearnTokens(line) {
  const n = line
    .toLowerCase()
    .replace(/[,;()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = n.split(' ').filter((w) => w.length > 1 && !LEARN_STOPWORDS.has(w));
  const uniq = [...new Set(words)];
  return uniq.slice(0, 12);
}

function generateTask(difficulty, excludeIds = []) {
  const pool = getTasksForDifficulty(difficulty).filter((t) => !excludeIds.includes(t.id));
  const source = pool.length ? pool : TASK_TEMPLATES;
  const template = pick(source);
  const built = template.build();
  const hints = built.hints || [];
  return {
    id: template.id,
    topic: template.topic,
    difficulty: template.difficulty,
    oracleOnly: true,
    ...built,
    learnSteps: deriveLearnSteps(built.solution, hints),
    oracleBonus: template.oracleBonus || built.oracleBonus,
  };
}

function generateExamSet(difficulty, count = 10) {
  const used = new Set();
  const tasks = [];
  const sequence = [
    ...Array(3).fill('easy'),
    ...Array(4).fill('medium'),
    ...Array(2).fill('hard'),
    ...Array(3).fill('expert'),
  ];
  let guard = 0;
  while (tasks.length < count && guard < 60) {
    guard++;
    const d = sequence[tasks.length] || difficulty;
    const t = generateTask(d, [...used]);
    if (!used.has(t.id)) {
      used.add(t.id);
      tasks.push(t);
    }
  }
  while (tasks.length < count) {
    tasks.push(generateTask(difficulty));
  }
  return tasks.slice(0, count);
}
