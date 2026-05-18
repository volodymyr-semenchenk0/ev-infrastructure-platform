# Pipeline detail

## Inputs

- `docs/вступ.md` — introduction
- `docs/chapter1/1_1_1.md ... 1_3.md` — Chapter 1 in 13 files
- `docs/chapter2/2_1_1.md ... 2_3_5.md` — Chapter 2 in 14 files
- `docs/chapter2/images/sources/*.puml` — 13 PlantUML diagrams (source)
- `docs/appendices/appendix_*.md` — appendix bodies
- `docs/sources/EV Charging.bib` — bibtex bibliography
- `docs/sources/files/N/*.pdf|html` — full-text source files (for page lookup)
- `outputs/coursework_build/citations_map.json` — bibtex_key → appearance number
- `outputs/coursework_build/page_lookups.json` — verified page numbers per (file:line, key)

## Outputs

- `build/master.md` — assembled and preprocessed Markdown
- `build/reference.docx` — pandoc reference doc with methodology styles
- `build/EV_charging_DSS_coursework.docx` — final document
- `build/BUILD_LOG.md` — build report (TODO list, unresolved figures/pages)

## Scripts

### 1. `build/render_plantuml.sh` — optional pre-step

Renders 13 `.puml` files in `docs/chapter2/images/sources/` to PNG in
`docs/chapter2/images/`. Auto-downloads `plantuml.jar` from GitHub releases.
Requires Java ≥ 8. Run **locally** on the user's machine; the cloud sandbox
cannot reach GitHub releases for the download.

Idempotent — re-running just refreshes PNGs.

### 2. `build/scripts/make_reference_docx.py`

Produces `build/reference.docx` by:

1. Calling `pandoc --print-default-data-file=reference.docx` to get the
   default pandoc reference doc.
2. Patching styles `Normal`, `Compact`, `Table`, `Heading1`, `Heading2`,
   `Heading3` to methodology values (TNR 14 pt, 1.5 spacing, 1.27 cm indent,
   bordered tables).
3. Patching page setup to A4 with margins 25/15/20/20 mm.
4. Writing the result to `build/reference.docx`.

**Why this matters:** pandoc emits `<w:pStyle w:val="Compact"/>` inside table
cells and `<w:tblStyle w:val="Table"/>` on every table. If these styles are
missing in the reference doc, LibreOffice/Word collapse tables to a single
column. Starting from pandoc's default ensures both styles exist; patching
gives them the methodology look.

### 3. `build/scripts/build_master_md.py`

Combines MD pieces in canonical order:

```
# ВСТУП
... вступ.md ...
# 1. ТЕОРЕТИЧНИЙ АНАЛІЗ ПРОБЛЕМИ
## 1.1. ...
... chapter1/1_1_1.md ...
... chapter1/1_1_2.md ...
...
## 1.2. ...
...
## 1.3. Постановка завдання
... chapter1/1_3.md ...
# 2. ПРОЕКТУВАННЯ СИСТЕМИ ...
## 2.1. ...
...
```

Applies preprocessing:

- **Image paths:** rewrite `images/foo.png` to absolute path; replace missing
  files with bold-italic placeholder lines.
- **PlantUML blocks:** strip ` ```plantuml ... ``` ` fences in Chapter 2.
- **`\tag{N.N}`:** strip and collect numbers; re-attach after each `$$` block
  as a right-aligned span.
- **Math fixes:** `\!` → space, `\,` → space, `\mathbb{X}` → `\mathbf{X}`.
- **Citations:** convert `[@key]` and `[@k1; @k2]` to `[N]` / `[N, p]` /
  `[N1; N2]`.
- **Quotes:** alternate straight `"..."` → «...» outside of code blocks.

### 4. pandoc step

```bash
pandoc build/master.md \
    --reference-doc=build/reference.docx \
    -f markdown+tex_math_dollars+tex_math_single_backslash \
    -t docx \
    -o build/EV_charging_DSS_coursework.docx
```

Extensions needed:
- `tex_math_dollars` — recognize `$...$` and `$$...$$`
- `tex_math_single_backslash` — recognize `\command` syntax

## Verification step (after build)

Open the docx in Word/LibreOffice and check:

1. **Headings:** "ВСТУП", "1. ТЕОРЕТИЧНИЙ АНАЛІЗ...", "2. ПРОЕКТУВАННЯ..." —
   centered, uppercase, bold (Heading 1 style).
2. **Subsections:** "1.1. ...", "2.3. ..." — left, indented 1.27 cm, bold.
3. **Tables:** all 22 tables have visible borders, fit page width, text wraps
   in cells.
4. **Formulas:** click on a `$$` formula — should open as a Word equation
   (Equation Editor). NOT italic text.
5. **Figures:** captioned "Рис. X.Y." below; missing ones show
   `[ПЛЕЙСХОЛДЕР: ...]`.
6. **Citations:** `[5]`, `[27; 28, 70]`, etc. — no `[@key]` leftovers.
7. **References list:** "СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ" with 31 numbered
   entries.
8. **Appendix:** "ДОДАТОК А" on a new page; table captions read "Таблиця А.1.".

## Iteration loop

When the user requests changes to text/structure:

1. Edit `docs/*.md` files (the source of truth).
2. Re-run `bash build/scripts/build_docx.sh`.
3. Replace the previous `build/*.docx` with the new one.

Never edit the `.docx` directly as a way to fix content — the next rebuild
will overwrite it. Fixes go in the MD sources or in the build scripts.

## Skipping PlantUML rendering

If you don't have Java locally, or just want to iterate faster:

```bash
SKIP_PLANTUML=1 bash build/scripts/build_docx.sh
```

Chapter 2 figures will all become placeholders in the output, but the rest of
the document builds normally.
