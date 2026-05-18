"""
Build build/master.md by combining all MD pieces in canonical order, then apply
preprocessing fixes for pandoc compatibility.

Inputs (relative to repo root):
  docs/вступ.md
  docs/chapter1/*.md (in canonical order)
  docs/chapter2/*.md (in canonical order)
  docs/appendices/*.md
  docs/bibliography.md (or built from outputs/coursework_build/bib_map.json)

Outputs:
  build/master.md

Preprocessing applied:
  1. Image paths → absolute (or replaced with placeholder if file missing)
  2. \\tag{N.N} stripped from formulas; numbers captured and re-attached as
     right-aligned spans after the formula
  3. \\! → space (negative thin space unsupported)
  4. \\mathbb{X} → \\mathbf{X} (pandoc OMML)
  5. \\, → space
  6. plantuml ``` ``` code blocks removed from Chapter 2 (rendered separately)
  7. Pandoc citations [@key] → [N] or [N, p] using outputs/coursework_build/
     citations_map.json
"""
import os, re, json, sys

ROOT = os.environ.get("REPO_ROOT", os.getcwd())
DOCS = os.path.join(ROOT, "docs")
OUT  = os.path.join(ROOT, "build", "master.md")
WORKDIR = os.path.join(ROOT, "outputs", "coursework_build")

# Load citation map and bib (built by build_citations.py)
def safe_load(path):
    return json.load(open(path)) if os.path.isfile(path) else {}

BIB = safe_load(os.path.join(WORKDIR, "bib_map.json"))
CITES = safe_load(os.path.join(WORKDIR, "citations_map.json")).get("key_to_num", {})
PAGES = safe_load(os.path.join(WORKDIR, "page_lookups.json")).get("verified", [])

# Page lookup: (filename, line, key) → page string
page_for = {}
for entry in PAGES:
    fname, lineno = entry["file_line"].split(":")
    for k in entry["keys"]:
        short = k.split("_")[0]
        page = entry.get(f"verified_page_{short}") or entry.get("verified_page")
        page_for[(fname, int(lineno), k)] = page

# Image regex with balanced brackets (alt may contain [stuff])
IMG_RE = re.compile(r"!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)]+)\)")

# ----------------------------------------------------------------------------

def fix_image(m):
    alt = m.group(1); rel = m.group(2)
    for base in [os.path.join(DOCS, "chapter1"), os.path.join(DOCS, "chapter2")]:
        candidate = os.path.join(base, rel)
        if os.path.isfile(candidate):
            return f"![{alt}]({candidate})"
    fn = os.path.basename(rel)
    return f"\n***[ПЛЕЙСХОЛДЕР: {fn} — рисунок підготувати окремо]***\n"

def strip_plantuml(text):
    return re.sub(r"```plantuml\s*\n.*?\n```\s*\n?", "", text, flags=re.DOTALL)

def fix_math(text):
    text = text.replace(r"\!", " ")
    text = text.replace(r"\,", " ")
    text = re.sub(r"\\mathbb\{([^}]+)\}", r"\\mathbf{\1}", text)
    return text

def fix_citations(text, fname):
    """Replace [@k1; @k2] with [N1; N2] or [N, p]."""
    def repl(m):
        raw = m.group(1)
        keys = [s.strip().lstrip("@") for s in raw.split(";")]
        # Determine line number of this match (approximate by scanning)
        # For accuracy we don't track line here; pages map keyed on file:line
        # is built per-file separately if needed.
        parts = []
        for k in keys:
            num = CITES.get(k)
            if num is None:
                parts.append(f"?{k}")
                continue
            parts.append(str(num))
        return "[" + "; ".join(parts) + "]"
    return re.sub(r"\[@([^\]]+)\]", repl, text)

def quote_smart(text):
    """Replace straight " with «...» alternating; preserve code blocks."""
    parts = re.split(r"(```.*?```|`[^`]+`)", text, flags=re.DOTALL)
    for i in range(0, len(parts), 2):
        chunk = parts[i]; out = []; open_q = True
        for ch in chunk:
            if ch == '"':
                out.append('«' if open_q else '»'); open_q = not open_q
            else:
                out.append(ch)
        parts[i] = "".join(out)
    return "".join(parts)

def collect_and_strip_tags(text):
    """Strip \\tag{N.N} (pandoc doesn't support it). Return (clean_text, [tags])."""
    tags = []
    def collect(m):
        tags.append(m.group(1)); return ""
    text = re.sub(r",?\s*\\tag\{(\d+\.\d+)\}", collect, text)
    return text, tags

def attach_formula_numbers(text, tags):
    """After each $$...$$ block, attach (N.N) on a right-aligned span."""
    lines = text.split("\n"); out = []; in_math = False; idx = 0
    for line in lines:
        if line.strip() == "$$":
            if not in_math:
                in_math = True; out.append(line)
            else:
                in_math = False; out.append(line)
                if idx < len(tags):
                    out.extend(["", f'<span style="display:block;text-align:right">({tags[idx]})</span>', ""])
                    idx += 1
        else:
            out.append(line)
    return "\n".join(out)

# ----------------------------------------------------------------------------

CH1 = ["1_1_1","1_1_2","1_1_3","1_1_4","1_1_5",
       "1_2_1","1_2_2","1_2_3","1_2_4","1_2_5","1_2_6","1_2_7","1_3"]
CH2 = ["2_1_1","2_1_2","2_1_3","2_1_4","2_1_5","2_1_6",
       "2_2_1","2_2_2","2_2_3",
       "2_3_1","2_3_2","2_3_3","2_3_4","2_3_5"]
SUB_HEADERS_1 = {
    "1_1_1": "## 1.1. Аналіз напрямків (перспектив) використання досліджуваних процесів",
    "1_2_1": "## 1.2. Математичний алгоритм, моделі та методи прийняття рішень",
}
SUB_HEADERS_2 = {
    "2_1_1": "## 2.1. Структура системи, що проектується",
    "2_2_1": "## 2.2. Опис інформаційного забезпечення",
    "2_3_1": "## 2.3. Розробка алгоритмів функціонування системи",
}

def read_md(path):
    return open(path, encoding="utf-8").read()

parts = []

# ВСТУП
intro = read_md(os.path.join(DOCS, "вступ.md"))
intro = re.sub(r"^##\s*ВСТУП\s*\n", "", intro, count=1)
parts.append("# ВСТУП\n\n" + intro.strip() + "\n")

# Розділ 1
parts.append("\n\n# 1. ТЕОРЕТИЧНИЙ АНАЛІЗ ПРОБЛЕМИ\n")
for name in CH1:
    if name in SUB_HEADERS_1: parts.append("\n" + SUB_HEADERS_1[name] + "\n")
    txt = read_md(os.path.join(DOCS, "chapter1", f"{name}.md"))
    txt = re.sub(r"^##\s+(\d+\.\d+\.\d+\.)\s", r"### \1 ", txt, flags=re.MULTILINE)
    txt = fix_citations(txt, name)
    parts.append(txt.strip() + "\n")

# Розділ 2
parts.append("\n\n# 2. ПРОЕКТУВАННЯ СИСТЕМИ ДЛЯ ДОСЛІДЖЕННЯ ПРОЦЕСІВ ВИБОРУ ЛОКАЦІЙ ЗАРЯДНИХ СТАНЦІЙ\n")
for name in CH2:
    if name in SUB_HEADERS_2: parts.append("\n" + SUB_HEADERS_2[name] + "\n")
    fp = os.path.join(DOCS, "chapter2", f"{name}.md")
    if not os.path.exists(fp): continue
    txt = read_md(fp)
    txt = re.sub(r"^#\s+2\..*?\n", "", txt, count=1, flags=re.MULTILINE)
    txt = re.sub(r"^##\s+(\d+\.\d+\.\d+\.)\s", r"### \1 ", txt, flags=re.MULTILINE)
    txt = strip_plantuml(txt)
    parts.append(txt.strip() + "\n")

# СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ
parts.append("\n\n# СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ\n\n")

def fmt_entry(num, key, bib):
    author = bib.get("author", "")
    if author:
        authors = [a.strip() for a in re.split(r"\s+and\s+", author)]
        fmt = []
        for a in authors:
            if "," in a:
                last, first = a.split(",", 1)
                inits = " ".join(f"{n.strip()[0]}." for n in first.strip().split() if n.strip())
                fmt.append(f"{last.strip()} {inits}")
            else:
                fmt.append(a.strip())
        author_str = ", ".join(fmt)
    else:
        author_str = ""
    title = bib.get("title","").strip()
    year = bib.get("year","")
    journal = bib.get("journal","")
    volume = bib.get("volume","")
    number = bib.get("number","")
    pages = bib.get("pages","")
    doi = bib.get("doi","")
    publisher = bib.get("publisher","")
    btype = bib.get("type","article")
    p = []
    if author_str: p.append(author_str + ".")
    p.append(title + ".")
    if btype == "book":
        if publisher: p.append(f"{publisher}, {year}." if year else f"{publisher}.")
        elif year: p.append(f"{year}.")
    else:
        if journal:
            seg = journal + "."
            if year: seg += f" {year}."
            if volume:
                seg += f" Т. {volume}"
                if number: seg += f", № {number}"
                seg += "."
            if pages: seg += f" С. {pages}."
            p.append(seg)
        elif year: p.append(f"{year}.")
    if doi: p.append(f"DOI: {doi}.")
    return " ".join(p)

NUM2KEY = {v: k for k, v in CITES.items()}
for num, key in sorted(NUM2KEY.items()):
    entry = fmt_entry(num, key, BIB.get(key, {}))
    parts.append(f"{num}. {entry}\n")

# ДОДАТКИ — окремий аркуш «ДОДАТКИ»
parts.append("\n\n# ДОДАТКИ\n")

# Додаток А (з docs/appendices/appendix_g.md, перейменовано Г→А)
appendix_path = os.path.join(DOCS, "appendices", "appendix_g.md")
if os.path.isfile(appendix_path):
    parts.append("\n# Додаток А\n\n## Повний опис атрибутів таблиць бази даних\n\n")
    ap = read_md(appendix_path)
    ap = re.sub(r"^##\s*ДОДАТОК\s*Г\s*\n", "", ap)
    ap = re.sub(r"^###\s*Повний опис[^\n]*\n", "", ap, flags=re.MULTILINE)
    ap = re.sub(r"Таблиця\s+Г\.(\d+)", r"Таблиця А.\1", ap)
    ap = re.sub(r"Рисунок\s+Г\.(\d+)", r"Рисунок А.\1", ap)
    parts.append(ap.strip() + "\n")

master = "\n".join(parts)

# Apply preprocessing
master = IMG_RE.sub(fix_image, master)
master, tags = collect_and_strip_tags(master)
master = fix_math(master)
master = quote_smart(master)
master = attach_formula_numbers(master, tags)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(master)
print(f"master.md saved: {OUT}  ({len(master)} chars, {len(tags)} formula tags)")
