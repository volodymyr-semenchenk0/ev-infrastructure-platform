# Known gotchas — DOCX build pipeline

Each row: **Symptom** → **Root cause** → **Fix**. Encountered during the v1→v4 evolution; encoded here to prevent re-doing the diagnosis.

## Tables

### Symptom: tables render as a single column with cells stacked vertically

Each row of a multi-column table appears as N rows of one-column text. There
are no visible borders.

**Root cause:** pandoc emits `<w:tblStyle w:val="Table"/>` and inside cells
`<w:pStyle w:val="Compact"/>`. If `reference.docx` was generated from scratch
with `python-docx`, those style IDs don't exist → fallback rendering collapses
table to single column with empty borders.

**Fix:** start `reference.docx` from pandoc's default
(`pandoc --print-default-data-file=reference.docx`) and patch styles in-place.
See `make_reference_docx.py`.

### Symptom: table content correct but no borders

Style is defined but `Table` style lacks `tblBorders`.

**Fix:** in the patched `Table` style, add:

```xml
<w:tblBorders>
  <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
</w:tblBorders>
```

## Formulas

### Symptom: formulas appear as italic LaTeX text instead of Word equations

`$$ S_i = \sum ... $$` renders as literal text `S_i = \\sum ...` in italic.

**Root cause:** earlier pipeline used `python-docx` directly and rendered math
runs as italic plain text. Native Word OMML requires pandoc.

**Fix:** convert through pandoc with `-f markdown+tex_math_dollars+tex_math_single_backslash`.

### Symptom: pandoc warning "Could not convert TeX math ... unexpected `{`"

Pandoc fails on certain LaTeX commands and falls back to raw TeX.

**Root causes & fixes:**

| Pattern | Why fails | Replacement |
|---|---|---|
| `\tag{1.7}` | pandoc OMML doesn't support equation numbering | Strip, attach number as right-aligned text after `$$` |
| `\!` (negative thin space) | unsupported | Replace with space |
| `\,` (thin space) | OMML conversion glitches | Replace with space |
| `\mathbb{1}` | OMML font mapping missing for blackboard bold | Replace with `\mathbf{1}` |
| `\quad`, `\qquad` | supported | leave as is |
| `\left[ ... \right]` | supported | leave as is |
| `\begin{cases}` | supported | leave as is |
| `\sum_{i=1}^{N}` | supported | leave as is |

### Symptom: formula number `(1.X)` ends up on a separate line, left-aligned

The fix that strips `\tag{}` and re-attaches numbers uses an HTML `<span>`
with `style="display:block;text-align:right"`. LibreOffice renders it
right-aligned; Word may render it left-aligned in some versions.

**Manual fix in Word:** select the `(1.X)` paragraph, press Tab, set a
right-aligned tab stop at the right margin. Or replace the span with a real
table (1 row × 2 cols, formula left, number right) in the build script.

## Images

### Symptom: image markdown literally appears in docx as `![alt](path)`

Or: pandoc warning "Could not fetch resource 'images/X.png'".

**Root cause:** image alt-text contains `[` or `]` (e.g.,
`![M=(l,m,u), x ∈ [l,u]](...)`). The naïve regex
`!\[([^\]]*)\]\(([^)]+)\)` stops alt-text at the first `]`, breaking the
match.

**Fix:** use bracket-balanced regex:

```python
IMG_RE = re.compile(r"!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)]+)\)")
```

Three Chapter 1 figures and the Monte Carlo activity diagram have such
alt-text.

### Symptom: figure caption appears but no image (and no placeholder)

The image file path is wrong or the file actually doesn't exist, but the
preprocessor incorrectly thought it did.

**Fix:** `build_master_md.py` checks both `docs/chapter1/<path>` and
`docs/chapter2/<path>` for the file. If neither exists, replaces with a
bold-italic placeholder line. Verify the check covers all source dirs.

## Citations

### Symptom: `[@chang_applications_1996]` appears literally in docx body

**Root cause:** citation map (`outputs/coursework_build/citations_map.json`)
is missing or this key isn't in it.

**Fix:** re-run the citation extraction. Specifically:

```bash
python3 outputs/coursework_build/extract_citations.py
```

Or rebuild the entire pipeline from scratch (see Skill main file).

### Symptom: a citation has wrong page number

**Root cause:** page was hallucinated, not verified from PDF.

**Fix:** the rule is **never invent page numbers**. Pages come from real PDFs
in `docs/sources/files/N/`. Use `pdftotext` to grep for the specific claim and
record the page in `outputs/coursework_build/page_lookups.json`. If the source
file is HTML-only or missing, the citation must stay `[N]` without page, and
the case logged in `build/BUILD_LOG.md` for manual follow-up.

## Indentation

### Symptom: first-line indent is 1.25 cm instead of 1.27 cm

`firstLine="709"` is МДР value. Курсова uses 1.27 cm = 720 twips.

**Fix:** in `make_reference_docx.py`, ensure all `firstLine` values are
`"720"` (not `"709"` or `"720pt"` or `"1.27cm"` — XML uses twips).

## Page count

### Symptom: output is 80–100+ pages when methodology says 40–50

Common causes (in order of likely impact):

1. **Long LaTeX formulas in the math-heavy subsections (1.2)** rendered as full-height display
   math — each formula takes 3–4 lines. Each subsection has 4–6 formulas.
   Total adds ~10–15 pages.
2. **A large comparison table in Chapter 1** has many rows and columns and
   wraps; takes 2–3 pages alone.
3. **Appendix А** with multiple attribute tables.
4. **Empty paragraph gaps** between figures/tables/headings (pandoc adds them
   liberally).

**Fixes (in order of effort):**

- Trim duplication in the prose around large tables.
- Move some FAHP/TOPSIS derivations from the math-heavy subsections (1.2) body to an appendix.
- Reduce vertical space in `Heading2` / `Heading3` styles
  (`spacing before/after`).
- Convert long inline lists to `– item; – item` prose.

## PlantUML

### Symptom: all Chapter 2 figures are placeholders even after running build

PlantUML rendering hasn't happened yet. The cloud sandbox **cannot** render
PlantUML (proxy blocks plantuml.com, kroki, GitHub releases).

**Fix:** run `bash build/render_plantuml.sh` locally on the user's machine.
This auto-downloads `plantuml.jar` from GitHub and produces PNGs in
`docs/chapter2/images/`. Then re-run `build/scripts/build_docx.sh`.

### Symptom: PlantUML script runs but some diagrams fail

Specific `.puml` files have syntax errors or use features missing in the
downloaded jar version.

**Fix:** check the script's stderr for the failing file, fix the `.puml`
manually. Use `https://www.plantuml.com/plantuml` web preview to debug.

## Reference doc generation

### Symptom: `make_reference_docx.py` produces a doc that pandoc rejects

The patched styles.xml is malformed (e.g., one of the regex replacements
failed silently).

**Fix:** after patching, validate by running

```bash
python3 -c "from docx import Document; Document('build/reference.docx')"
```

If it raises, inspect `word/styles.xml` for unbalanced tags.
