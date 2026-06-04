---
name: coursework-docx-build
description: How to correctly produce the final DOCX deliverable for this coursework from the MD source files. Use whenever the user asks to "build the docx", "regenerate the report", "compile the report", "make the .docx", or to fix a problem in the docx (broken tables, broken formulas, missing figures, wrong typography, citation conversion). The skill encodes the exact pandoc pipeline, reference.docx structure, and pre/post-processing fixes that produce a methodology-compliant DOCX with native Word formulas (OMML), bordered tables, and proper image placeholders. Trigger this skill even when the user just says "формули зламались" or "таблиці не рендеряться" — these are this skill's exact failure modes.
---

# DOCX build pipeline — EV-charging-DSS coursework

This skill encodes the **technical pipeline** that converts MD sources in `docs/` into the final coursework DOCX. It complements `coursework-formatting` (which defines the visual rules) — this skill is *how* to apply those rules to a working DOCX.

## When to apply

- "Збери/перебудуй docx", "make the report", "compile the .docx"
- "Формули зламались / некоректно", "Word-формули"
- "Таблиці не показуються / без меж / однією колонкою"
- "Рисунки не вставились / плейсхолдери"
- "Цитування `[@key]` не сконвертувалися"
- "PlantUML-діаграми не згенерувалися"
- Any complaint about the produced `build/*.docx`

## Production pipeline (canonical)

The repo has a working pipeline in `build/scripts/`:

```
build/
├── scripts/
│   ├── build_docx.sh        # orchestrator — run this
│   ├── build_master_md.py   # combines MD pieces + preprocessing
│   └── make_reference_docx.py  # produces reference.docx for pandoc
├── render_plantuml.sh       # renders the .puml diagrams → .png (user runs locally)
└── (output files: master.md, reference.docx, *.docx, BUILD_LOG.md)
```

To rebuild the docx after MD edits:

```bash
cd <repo_root>
bash build/scripts/build_docx.sh
```

Result: `build/EV_charging_DSS_coursework.docx`.

## Why this exact pipeline (load-bearing constraints)

### 1. The reference.docx MUST be based on pandoc's default

**Wrong:** generate `reference.docx` from scratch via `python-docx`. This omits two
styles that pandoc emits in its output: `Table` (table style) and `Compact`
(in-cell paragraph style). When those styles are missing, **tables collapse to
a single column** in LibreOffice/Word.

**Right:** start from pandoc's default reference doc:

```bash
pandoc -o ref_base.docx --print-default-data-file=reference.docx
```

Then patch styles `Normal`, `Heading1-3`, `Table`, `Compact` and the page setup
(see `make_reference_docx.py`). This is the only way tables render correctly.

### 2. Formulas need OMML, not italic plain text

pandoc converts `$inline$` and `$$display$$` to native Word OMML
(`<m:oMath>...`) — proper editable Word equations. Required pandoc flags:

```
pandoc input.md -f markdown+tex_math_dollars+tex_math_single_backslash -t docx -o out.docx
```

**Critical preprocessing before pandoc** (otherwise pandoc fails silently and
renders the formula as raw TeX text):

| Source pattern | Replace with | Why |
|---|---|---|
| `\tag{1.7}` | strip; track number separately | Not supported by pandoc OMML |
| `\!` | space | Negative thin space — unsupported |
| `\,` | space | Thin space — pandoc-friendly |
| `\mathbb{1}` | `\mathbf{1}` | `\mathbb` produces unrenderable OMML |

Formula numbers stripped from `\tag{}` get re-attached as a right-aligned
`<span>` line after the formula. In Word the user may need to convert this
span to a real right tab-stop manually.

### 3. Image alt-text can contain `[brackets]`

The naïve `!\[([^\]]*)\]\(([^)]+)\)` regex fails on alt-text like
`![M=(l,m,u)... [l,u]](images/fig.png)` because alt contains `]`. Use the
bracket-balanced version:

```python
IMG_RE = re.compile(r"!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)]+)\)")
```

Several figures (e.g. the Chapter 1 SVG diagrams and the Monte Carlo activity
diagram) have such alt-text — the naïve regex misses them and pandoc tries to
fetch the non-existent file, producing warnings.

### 4. Chapter 2 PlantUML blocks must be stripped before pandoc

`docs/chapter2/*.md` files contain BOTH a markdown image placeholder and the
inline PlantUML source as a fenced code block. The build script strips
` ```plantuml ... ``` ` fences (since PlantUML PNGs are generated separately by
`render_plantuml.sh`).

### 5. Pandoc-style `[@key]` citations need numeric conversion

The MD files use Pandoc citation syntax `[@chang_applications_1996]`. The
methodology requires numeric citations. Format rules (з методички):
- `,` — відділяє номер джерела від сторінки (або діапазону сторінок)
- `;` — розділяє різні джерела всередині дужок
- Приклад: `[16, 44; 18, 7-13]` — стор. 44 у джерелі №16, стор. 7–13 у джерелі №18
- Без сторінки: `[N]`; кілька без сторінок: `[N1; N2]`
Conversion is done by `build_master_md.py` using
`outputs/coursework_build/citations_map.json` (mapping bibtex key → appearance
number) and `page_lookups.json` (verified page numbers for SPECIFIC citations).

**Never invent page numbers.** Pages come from real PDFs in
`docs/sources/files/N/`. If a source is HTML-only or missing, citation stays
`[N]` without page (and TODO is logged in `build/BUILD_LOG.md`).

## Methodology-aligned reference.docx (key parameters)

| Element | Value | Twips/units |
|---|---|---|
| Page size | A4 (210×297 mm) | 11906 × 16838 twips |
| Margins | top 20, right 15, bottom 20, left 25 mm | 1134/850/1134/1417 twips |
| Body font | Times New Roman 14 pt | `sz="28"` (half-points) |
| Body line spacing | 1.5 | `line="360" lineRule="auto"` |
| Body first-line indent | 1.27 cm | `firstLine="720"` |
| Body alignment | justify | `jc="both"` |
| Table cell text | Times New Roman 12 pt | `sz="24"` |
| Table cell spacing | 0 before, 0 after | `before="0" after="0"` |
| Table cell line | single | `line="240"` |
| Table borders | single 0.5 pt black | `sz="4"`, color `000000` |
| Heading 1 | UPPERCASE, centered, bold, 14 pt | `caps`, `jc="center"` |
| Heading 2/3 | Bold, justified, with 1.27 cm indent | `firstLine="720"` |

Common conversion factors:
- 1 inch = 1440 twips = 2.54 cm
- 1 cm = 567 twips
- 1.27 cm = 720 twips (this is the коусова indent; **not** 709 which is 1.25 cm)
- 14 pt = 28 half-points = `sz="28"` in XML

## Common failures and fixes

For full detail see `references/known-gotchas.md`. Quick map:

| Symptom | Likely cause | Fix |
|---|---|---|
| Tables show as one column | Missing `Table` / `Compact` style in reference.docx | Use pandoc default as base for reference.docx |
| Formulas as italic LaTeX text | Pandoc failed on `\tag{}`, `\!`, `\mathbb{1}` | Apply preprocessing in `build_master_md.py` |
| Image placeholder shows `![alt](images/...)` literally in docx | Alt-text contains `[brackets]` and the naïve regex skipped it | Use bracket-balanced IMG_RE |
| `[@chang_...]` literal in body | Citation map missing | Rebuild `outputs/coursework_build/citations_map.json` |
| Cells stacked vertically | tblLayout autofit + missing tblBorders | Patch `Table` style with explicit borders |
| Wrong indent (1.25 instead of 1.27 cm) | Using `firstLine="709"` (МДР value, not курсова) | Use `firstLine="720"` |
| Page count >50 | Long LaTeX formulas + large comparison tables | Reduce duplication around large tables; move long formulas to appendix |
| PlantUML PNG missing | Local rendering not run / `plantuml.jar` not in `build/tools/` | Run `bash build/render_plantuml.sh` locally |

## Detailed references

- `references/pipeline-detail.md` — full step-by-step of the pipeline, what each
  script does, what input it expects, what output it produces
- `references/known-gotchas.md` — every failure mode encountered, with the
  exact symptom, root cause, and fix

Read the relevant reference only when troubleshooting a specific issue.
