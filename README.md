# RBD Generator testów SQL Oracle - PJATK

Generator zadań **Oracle SQL** do nauki i ćwiczeń na przedmiocie **RBD** (PJATK).

## Linki

| | Adres |
|---|--------|
| **PJATK** | [https://users.pja.edu.pl/~s36518/rbd-sql-generator/](https://users.pja.edu.pl/~s36518/rbd-sql-generator/) |
| **Vercel** | [https://oracle-sql-trainer.vercel.app](https://oracle-sql-trainer.vercel.app) |

## Funkcje

- **Ćwiczenia** — losowe zadania, podpowiedzi, wzorcowe rozwiązania
- **Nauka** — krok po kroku wg podpowiedzi
- **Egzamin** — 10 zadań, 25 minut, bez ściągi
- **Diagram ER** — kliknij, aby powiększyć
- Składnia Oracle: ROUND, FETCH FIRST, ROWNUM, NVL, OFFSET

## Lokalnie

```bash
git clone https://github.com/mateusz-dylewski/rbd-generator-testow-sql-oracle-pjatk.git
cd rbd-generator-testow-sql-oracle-pjatk
python3 -m http.server 8080
```

Plik `schema.sql` — DDL i dane testowe do [Oracle Live SQL](https://livesql.oracle.com).

## Skróty

| Skrót | Akcja |
|-------|--------|
| `Ctrl/Cmd + Enter` | Sprawdź zapytanie |
| `Ctrl/Cmd + N` | Następne zadanie |
