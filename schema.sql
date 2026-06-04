CREATE TABLE miasto (
    id_miasto   NUMBER(5) PRIMARY KEY,
    nazwa       VARCHAR2(80) NOT NULL
);

CREATE TABLE nauczyciel (
    id_nauczyciel NUMBER(5) PRIMARY KEY,
    imie          VARCHAR2(40) NOT NULL,
    nazwisko      VARCHAR2(40) NOT NULL,
    pensja        NUMBER(10,2) NOT NULL
);

CREATE TABLE uczen (
    id_uczen        NUMBER(5) PRIMARY KEY,
    imie            VARCHAR2(40) NOT NULL,
    nazwisko        VARCHAR2(40) NOT NULL,
    id_miasto       NUMBER(5) NOT NULL REFERENCES miasto(id_miasto),
    id_wychowawca   NUMBER(5) NOT NULL REFERENCES nauczyciel(id_nauczyciel)
);

CREATE TABLE przedmiot (
    id_przedmiot NUMBER(5) PRIMARY KEY,
    nazwa        VARCHAR2(80) NOT NULL
);

CREATE TABLE ocena (
    id_ocena      NUMBER(5) PRIMARY KEY,
    wartosc       NUMBER(1) NOT NULL CHECK (wartosc BETWEEN 1 AND 6),
    id_uczen      NUMBER(5) NOT NULL REFERENCES uczen(id_uczen),
    id_przedmiot  NUMBER(5) NOT NULL REFERENCES przedmiot(id_przedmiot),
    id_nauczyciel NUMBER(5) NOT NULL REFERENCES nauczyciel(id_nauczyciel)
);

INSERT INTO miasto VALUES (1, 'Warszawa');
INSERT INTO miasto VALUES (2, 'Kraków');
INSERT INTO miasto VALUES (3, 'Gdańsk');

INSERT INTO nauczyciel VALUES (1, 'Anna', 'Kowalska', 4500);
INSERT INTO nauczyciel VALUES (2, 'Piotr', 'Nowak', 3800);
INSERT INTO nauczyciel VALUES (3, 'Maria', 'Wiśniewska', 2100);
INSERT INTO nauczyciel VALUES (4, 'Tomasz', 'Lewandowski', 1950);

INSERT INTO uczen VALUES (1, 'Jan', 'Malinowski', 1, 1);
INSERT INTO uczen VALUES (2, 'Kasia', 'Zielińska', 2, 2);
INSERT INTO uczen VALUES (3, 'Szymon', 'Czeresnia', 1, 1);
INSERT INTO uczen VALUES (4, 'Ola', 'Wójcik', 3, 3);

INSERT INTO przedmiot VALUES (1, 'Matematyka');
INSERT INTO przedmiot VALUES (2, 'Historia');
INSERT INTO przedmiot VALUES (3, 'Informatyka');

INSERT INTO ocena VALUES (1, 5, 1, 1, 1);
INSERT INTO ocena VALUES (2, 4, 1, 2, 2);
INSERT INTO ocena VALUES (3, 2, 3, 1, 1);
INSERT INTO ocena VALUES (4, 3, 3, 1, 3);
INSERT INTO ocena VALUES (5, 5, 2, 3, 2);
INSERT INTO ocena VALUES (6, 6, 4, 1, 1);
INSERT INTO ocena VALUES (7, 5, 4, 1, 1);

COMMIT;
