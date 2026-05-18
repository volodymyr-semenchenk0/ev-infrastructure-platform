---
name: coursework-formatting
description: Encodes the complete formatting and typography requirements for the Master's-level coursework (курсова робота) "Системи підтримки прийняття рішень" at Cherkasy National University, per Chemerys 2024 methodology. Use this skill whenever the user formats coursework text — fonts, margins, indentation, line spacing, page numbering — or formats specific elements like figures, tables, formulas, lists, references, citations, or appendices. Trigger this skill even when the user only asks "is this formatted right" or "how should I write the figure caption" or "what's the citation format" — also trigger when the user asks general questions like "remind me of the formatting rules", "is this acceptable", or pastes a fragment for review. The skill answers definitively because the methodology has specific rules that differ from generic ДСТУ 8302 expectations (e.g. figure caption is "Рис. 1.1." with a period, table heading is "Таблиця 4.1.", paragraph indent is 1.27 cm, font is Times New Roman Cyr 14 pt). Use this skill to prevent the most common errors: missing periods after numbers, incorrect quote marks, wrong appendix letters, "де:" with a colon, double spaces, and color/underline in body text.
---

# Coursework Formatting — DSS Coursework

This skill encodes the complete formatting requirements for the Master's coursework on Decision Support Systems at Cherkasy National University, per Chemerys M. M. methodology (2024).

## When to apply this skill

Apply whenever the user touches anything formatting-related:

- Sets up the document (font, margins, line spacing, page size)
- Inserts a figure, table, formula, list, or footnote
- Writes a heading, subheading, or section number
- Cites a source or builds a bibliography entry
- Names an appendix
- Asks "is this formatted correctly"
- Reviews a fragment for compliance
- Asks a generic question like "what are the rules"

## Core parameters (committed to memory)

These parameters apply to the entire main text:

| Parameter | Value |
|---|---|
| Page size | A4 (210 × 297 mm), one-sided print |
| Font | Times New Roman Cyr |
| Font size (body) | 14 pt |
| Line spacing | 1.5 |
| Paragraph indent | 1.27 cm |
| Body alignment | Justified (по ширині) |
| Heading alignment (chapter) | Centered |
| Heading alignment (subsection) | Justified, with 1.25 cm indent |
| Distance: heading → next text | 24 pt |
| Distance: previous text → subsection heading | 36 pt |
| Total volume | 40–50 pages without appendices |
| Page numbering | Continuous, top-right corner, no period; title page counts but shows no number |
| Quote marks | Кутові: «текст» |

Non-default differences from generic ДСТУ:
- The font specifically is **Times New Roman Cyr**, not just "Times New Roman".
- The paragraph indent is **1.27 cm**, not 1.25 cm.
- Section numbers carry **a trailing period** ("2.1." not "2.1") — see Headings section below.

## Style and language

- Language of the work: Ukrainian.
- Defense language: English.
- Voice: third person OR impersonal. Allowed phrasings: «як показують наші розрахунки», «ми вважаємо», «наше рішення», «в роботі наведено», «підсумовуючи викладене вище». First-person singular ("я думаю", "я пропоную") is forbidden.
- Single terminology throughout — pick a term and stick with it.
- Avoid foreign words when a Ukrainian equivalent exists.
- Foreign organization names: not declined, wrapped in кутові lapky («Microsoft», «TOKA»).
- No double spaces. No space before punctuation. No coloured or underlined text in the body. **Bold** is allowed only for headings and labeled introduction elements.

## Headings

Six rules:

1. Top-level structural parts without numbering — printed in **UPPERCASE**, centered, no period at end:
   - ВСТУП
   - ВИСНОВКИ
   - СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ
   - ДОДАТКИ

2. Numbered chapters — UPPERCASE, centered, period after the number, no period at end:
   ```
   1. ТЕОРЕТИЧНИЙ АНАЛІЗ ПРОБЛЕМИ
   2. ПРОЕКТУВАННЯ СИСТЕМИ ДЛЯ ДОСЛІДЖЕННЯ ПРОЦЕСІВ ВИБОРУ ЛОКАЦІЙ ЗАРЯДНИХ СТАНЦІЙ
   3. РЕАЛІЗАЦІЯ СИСТЕМИ ЗА ТЕМОЮ КУРСОВОЇ РОБОТИ
   ```

3. Subsections — initial capital then lowercase, justified with 1.25 cm indent, period after the number, no period at end:
   ```
   1.1. Аналіз напрямків (перспектив) використання...
   2.3. Розробка алгоритмів функціонування системи
   ```

4. Sub-subsections (3rd level) — same rules: initial cap then lowercase, period after the number:
   ```
   1.2.4. Математичний апарат методу Fuzzy AHP
   ```

5. Each chapter starts on a new page.

6. Word breaks (hyphenation) in headings are forbidden. A heading must not sit on the last line of a page — at least two lines of body text must follow it.

## Figures, tables, formulas, lists, references — see references

For complete rules with examples, consult the appropriate reference:

- For figures, tables, and formulas — read `references/figures_tables_formulas.md`
- For lists, footnotes, abbreviations, and citation formatting — read `references/text_lists_citations.md`
- For the bibliography list and the appendix system — read `references/references_appendices.md`

Read only the reference relevant to the user's current task.

## Producing the final DOCX

This skill defines the *visual rules*. The actual mechanical pipeline that
converts MD sources into a methodology-compliant DOCX (with native Word
formulas, bordered tables, proper margins) lives in the sibling skill
**`coursework-docx-build`**. Trigger that skill when the user asks to
"build/regenerate the report" or reports broken formulas/tables/citations in
the produced `build/*.docx`. Do NOT try to hand-edit the docx — make changes
in the MD sources and rebuild via `bash build/scripts/build_docx.sh`.

## Quick-reference: most common errors and corrections

| ❌ Error | ✅ Correct |
|---|---|
| `2.1 Назва підрозділу` | `2.1. Назва підрозділу` (period after number) |
| `Рис. 1.1 Назва` | `Рис. 1.1. Назва` (period after number) |
| `Таблиця 2.1 — Назва` | `Таблиця 2.1. — Назва` |
| `Рисунок 1.1` | `Рис. 1.1.` (the methodology uses abbreviated form) |
| `"text"` or `'text'` | `«text»` (кутові) |
| `Т.Г. Шевченко` | `Т. Г. Шевченко` (non-breaking spaces between initials and surname) |
| `Times New Roman` | `Times New Roman Cyr` |
| `Indent 1.25 cm` | `Indent 1.27 cm` (this is the coursework value, not the МДР value) |
| `Додаток Е` | `Додаток Ж` (Е is forbidden in coursework) |
| `Додаток З` | `Додаток К` (З is forbidden, also Е, І, Й) |
| `де:` | `де` (no colon after "де") |
| `«я вважаю»` (first-person sg.) | `«ми вважаємо»` or `«в роботі наведено»` |
| Double space between words | Single space |
| Color or underline in body text | Plain bold for headings only |
| Empty cell in table | `–` (dash) |
| `(65±3) %` (no spaces) | `(65 ± 3) %` (spaces around ±) |
| `5  000` (multiple spaces in number) | `5 000` (single thin/regular space, grouping by 3 from right) |
| Bold for emphasis in body text | Italic only, sparingly |

## Appendix letters — coursework-specific

The list of forbidden letters in this coursework methodology is **different from the МДР list**. Memorize this:

**Forbidden:** Є, С, З, Ї, Е, І, Й, О, Ч, Ь.

**Allowed sequence:** А, Б, В, Г, Д, **Ж**, **К**, Л, М, Н, П, Р, Т, У, Ф, Х, Ш, Щ, Ю, Я.

After Д, the next letter is Ж (skip Е). After Ж, the next is К (skip З, І, Й). After Н, the next is П (skip О).

Inside an appendix, figures/tables/formulas use the letter as prefix: `Рис. А.1`, `Таблиця Б.2`, `(Г.1)`.

## Standards

The methodology references these standards. Cite them only when relevant:

- ГОСТ 2.105-95 ЄСКД — general text document requirements
- ГОСТ 19.105-78 ЄСПД — software documentation requirements
- ГОСТ 19.404-79 ЄСПД — explanatory note structure
- ГОСТ 19.005-85 ЄСПД — algorithm flowchart symbols
- ГОСТ 19.401-78 ЄСПД — program text formatting
- ГОСТ 19.402-78 ЄСПД — program description
- ГОСТ 19.781-90 ЄСПД — terminology
- ДСТУ 8302:2015 — bibliographic references

## Defense logistics

- Submit to supervisor at least 3 days before defense.
- Plagiarism check: PDF without appendices uploaded to Google Classroom (Unicheck) before defense.
- Presentation: PPTX or PDF.
- Defense talk: English, 5–7 minutes.
- Defense panel: 2–3 lecturers + supervisor.

## Grading anchor (for prioritization)

| Criterion | Max points |
|---|---|
| On-time topic & assignment approval | 10 |
| Technical task, methods/tools selection, formatting quality | 20 |
| **Algorithmic / mathematical / functional complexity** | **50** |
| Defense quality | 20 |

Formatting alone accounts for ~10 points (part of the 20-point block). The math and software complexity carries 50 points. Allocate review effort accordingly: formatting must be correct, but spending hours polishing margins is misallocated. Spend the time on math derivation depth and prototype quality.
