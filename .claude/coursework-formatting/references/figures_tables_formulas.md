# Reference: Figures, Tables, and Formulas

Read this reference when the user works on inserting or formatting any figure, table, or formula in the coursework.

## Figures (Рисунки)

### Naming and abbreviation

The coursework methodology uses the **abbreviated form** "Рис." with a period after the number:

```
Рис. 1.1. Головна сторінка GANTPRO
```

This is different from generic ДСТУ which uses "Рисунок" without period after number. **For this coursework, use "Рис. X.Y." with period.**

### Caption rules

- Caption goes **under** the figure, centered, single line spacing, no paragraph indent.
- Format: `Рис. <chapter>.<sequence>. <Name>` — period after number, period after name.
- No underline. No bold.
- If the caption is multi-line, all lines centered.

### Numbering

- Per chapter: `Рис. 1.1`, `Рис. 1.2`, ..., `Рис. 2.1`, ...
- Inside an appendix: prefix with the appendix letter — `Рис. А.1`, `Рис. А.2`, `Рис. Б.1`, etc.

### Placement

- Place immediately after the first reference, or as close as possible (next page if necessary).
- Center horizontally on the page.
- Separate from surrounding text by a blank line above and below.

### In-text references

```
(рис. 1.5)
як показано на рис. 1.5
згідно з рис. 1.5 – 1.7
(рис. 1.5 та 1.6)
(див. рис. 1.5)            ← for repeated reference to the same figure
```

Use lowercase "рис." in inline references (uppercase only in the caption itself or when it starts a sentence).

### Source-cited figures

If a figure is taken from another work, cite the source in the caption or in a footnote attached to the caption:

```
Рис. 2.3. Архітектура системи [12, c. 45]
```

### Multi-page figures

If a figure spans multiple pages:
- Full caption on the first page only;
- On subsequent pages: `Рис. 2.3, аркуш 2`.

### Sub-figures with explication

If a figure has labeled parts (1, 2, 3...):

```
1 – клієнт; 2 – сервер; 3 – база даних; 4 – зовнішній API
Рис. 2.4. Архітектура клієнт-серверної системи
```

The legend goes between the figure and the caption.

## Tables (Таблиці)

### Heading

The coursework methodology format uses **a period after the table number**:

```
Таблиця 4.1. – Результати тестування системи
```

The dash separator (–, U+2013) between the number and the title is conventional. Some examples in the methodology use just whitespace; both are acceptable, but the period after the number is mandatory. Never use the em-dash «—».

### Heading position

- Heading goes **above** the table, left-aligned with paragraph indent (1.27 cm).
- Initial capital, no period at end of name.
- The word "Таблиця" is **not abbreviated** in the heading itself; in inline references it becomes "табл."

### Table body formatting

- Font: 12 pt or 10 pt (smaller than body text).
- Line spacing: single (одинарний).
- Column headings: initial capital, centered horizontally.
- Sub-headings: lowercase if continuing the parent heading, otherwise initial cap.
- No periods after column headings.
- Body cells: text left-aligned; numerical values right-aligned with units in the heading.
- Empty cell: never blank — use `–` (en-dash).

### Numbers in cells

- Numbers ≥ 5 digits: group by three from right with a space (e.g. `1 234 567`).
- Decimal separator: comma in Ukrainian (`3,14`).
- Align decimals: ones under ones, tenths under tenths.

### Continuation across pages

If a table spans multiple pages:

- The first page shows the full heading: `Таблиця 4.1. – Результати тестування системи` and the column headers.
- The second page starts with: `Продовження таблиці 4.1` (без double-quotes, no full title).
- The last page starts with: `Закінчення таблиці 4.1` (if there are 3+ parts).
- All continuation pages must repeat the column-header row OR include a numbered row that maps to the original column numbers.

### Layout balance

- Left side-bar (boilerplate column) must not exceed 1/3 of the table width.
- Header height must not exceed 1/3 of the total table height.

### Numbering

- Per chapter: `Таблиця 1.1`, `Таблиця 1.2`, ..., `Таблиця 2.1`, ...
- Inside appendices: prefix — `Таблиця А.1`, `Таблиця Б.2`.

### Tables that exceed page size

- Move into appendices and cite from the main text.
- Or rotate the page (landscape orientation) so the table reads correctly when the reader rotates the printed page clockwise.

### In-text references

```
(табл. 2.3)
наведено в табл. 2.3
у табл. 2.3 – 2.5
(див. табл. 2.3)         ← for repeated reference
```

Use the unabbreviated form "таблиця" only when there is no number reference.

### Required tables in this coursework

Which tables are mandatory and what they contain is defined in `docs/СТРУКТУРА_КУРСОВОЇ.md` — consult that file, do not hard-code the list here. Regardless of content, every table heading uses the format «Таблиця X.Y. – Назва» (see the Tables section above).

## Formulas (Формули)

### Position and spacing

- Formulas are placed on a separate line, centered horizontally.
- One blank line above and below the formula.
- Formula text inline with the surrounding paragraph context.

### Numbering

- Per chapter: `(1.1)`, `(1.2)`, ..., `(2.1)`, ...
- Number in parentheses, right-aligned on the same line as the formula.
- Inside appendices: `(А.1)`, `(Б.2)`.

Example layout:

```
                    ЗЕО = A * P * Q,                              (1.1)
```

### Variable explanation

After the formula, on a new line, write the word **«де»** without a colon, then list each symbol on its own line. Period after the last variable.

```
де ЗЕО – загальна ефективність обладнання;
A – показник доступності обладнання, 0,7;
P – показник продуктивності, 0,6;
Q – показник якості, 0,5.
```

Critical points:
- "де" with **no colon** after it. Writing "де:" is a common error and is wrong.
- Each variable starts on a new line.
- Each line ends with semicolon, except the last which ends with period.
- No paragraph indent on the "де" line.
- Units of measurement go inline with the explanation, not in the formula itself.

### Multi-line formulas

Allowed line breaks: only on operator signs `=`, `+`, `−`, `×`, `/`. The operator is **repeated at the start of the next line**:

```
S = a₁ + a₂ + a₃ +
  + a₄ + a₅                                                      (1.2)
```

### Sequential formulas without intervening text

Separated by comma before the number:

```
f₁(x, y) = S₁  і  S₁ ≤ S₁_max,                                  (3.2)
f₂(x, y) = S₂  і  S₂ ≤ S₂_max.                                  (3.3)
```

### Numeric values with tolerances

Spaces around ± and around units:

```
(65 ± 3) %
(80 ± 2) мм
```

### In-text references

```
у формулі (3.1)
як випливає з (3.1)
розраховується за (3.1)
```

### Required formulas in this coursework

Which subsections carry the mathematical apparatus and the expected formula composition is defined in `docs/СТРУКТУРА_КУРСОВОЇ.md` — consult that file, do not hard-code counts here. Regardless of count, every formula is numbered per chapter and followed by a «де»-explanation (see the Formulas section above).

## Common errors to fix on sight

| ❌ | ✅ |
|---|---|
| `Рис. 1.1 Назва` | `Рис. 1.1. Назва` |
| `Рисунок 1.1.` | `Рис. 1.1.` (use abbreviated form per methodology) |
| Caption above figure | Caption under figure |
| `Таблиця 2.1 – Назва` (no period after number) | `Таблиця 2.1. – Назва` |
| Heading under the table | Heading above the table |
| Empty cell | `–` |
| `де:` with colon | `де` without colon |
| All variables on one line after "де" | Each variable on its own line |
| `(65±3)%` | `(65 ± 3) %` |
| Numbers with periods as thousands separator: `5.000` | Spaces: `5 000` |
| Period after column heading in table | No period |
