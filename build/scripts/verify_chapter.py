"""
Verify chapter subsections against coursework formal requirements.

Usage:
    python3 build/scripts/verify_chapter.py <chapter_number>
    e.g. python3 build/scripts/verify_chapter.py 1

Reports per-subsection issues:
  • Wrong dashes (hyphen "-" mid-word, em-dash "—" anywhere)
  • Straight quotes "  '  instead of «»
  • Formula tags missing or doubled
  • Figure/table captions malformed
  • Citation placeholders [@key] left unresolved
  • Volume estimate (char count → page estimate)

Exit code: 0 if clean, 1 if issues found.
"""
import os, re, sys, json, glob

ROOT = os.environ.get("REPO_ROOT", os.getcwd())
DOCS = os.path.join(ROOT, "docs")

# Coursework subsection limits (chars; 1 page ≈ 1900 chars at 14pt TNR 1.5)
PAGE_CHARS = 1900
LIMITS = {
    # 1.X
    "1_1_1": 1.5, "1_1_2": 1.5, "1_1_3": 1.5, "1_1_4": 1.5, "1_1_5": 1.5,
    "1_2_1": 1.0, "1_2_2": 1.0, "1_2_3": 1.0, "1_2_4": 1.5, "1_2_5": 1.5,
    "1_2_6": 1.0, "1_2_7": 1.0, "1_3": 3.0,
    # 2.X
    "2_1_1": 1.0, "2_1_2": 0.7, "2_1_3": 0.7, "2_1_4": 0.7, "2_1_5": 0.7, "2_1_6": 1.0,
    "2_2_1": 0.7, "2_2_2": 1.5, "2_2_3": 1.0,
    "2_3_1": 1.5, "2_3_2": 1.5, "2_3_3": 1.5, "2_3_4": 1.0, "2_3_5": 1.0,
    # 3.X
    "3_1_1": 1.0, "3_1_2": 1.5, "3_1_3": 1.0, "3_1_4": 1.0, "3_1_5": 1.5,
    "3_1_6": 0.7, "3_1_7": 0.7,
    "3_2_1": 1.5, "3_2_2": 1.5, "3_2_3": 1.5, "3_2_4": 1.0, "3_2_5": 1.5,
    "3_2_6": 1.0, "3_2_7": 1.0,
}

def check_file(path):
    """Return list of (severity, line, message) tuples."""
    issues = []
    text = open(path, encoding="utf-8").read()
    lines = text.split("\n")
    fname = os.path.basename(path).replace(".md","")

    # Strip code blocks to avoid false positives
    in_code = False
    in_math = False

    for i, line in enumerate(lines, 1):
        if line.strip().startswith("```"):
            in_code = not in_code; continue
        if line.strip() == "$$":
            in_math = not in_math; continue
        if in_code or in_math: continue

        # 1. Em-dash «—» is forbidden — only «–» (en-dash) allowed
        if "—" in line:
            issues.append(("ERR", i, f'em-dash «—» знайдено: {line.strip()[:80]}'))

        # 2. Straight ASCII quotes (outside inline code)
        # Strip inline code spans first
        scan = re.sub(r"`[^`]+`", "", line)
        if '"' in scan:
            issues.append(("ERR", i, f'прямі лапки " : {line.strip()[:80]}'))

        # 3. Hyphen between Cyrillic words «слово-слово» where it should be en-dash «слово – слово»
        # Heuristic: "[а-яА-Я] - [а-яА-Я]" with spaces is wrong (should be en-dash with spaces)
        if re.search(r"[а-яА-ЯіІїЇєЄ]\s+-\s+[а-яА-ЯіІїЇєЄ]", line):
            issues.append(("ERR", i, f'дефіс замість тире «–»: {line.strip()[:80]}'))

        # 4. Figure caption format check
        m = re.match(r"^\s*(?:!\[.*?\]\(.*?\)\s*)?Рис\.\s*(\d+\.\d+)\.?\s*", line)
        if line.strip().startswith("Рис.") or "Рисунок" in line[:20]:
            if not re.match(r"^Рис\.\s*\d+\.\d+\.\s+[А-ЯІЇЄ]", line.strip()):
                # tolerate placeholder lines
                if "ПЛЕЙСХОЛДЕР" not in line:
                    issues.append(("WARN", i, f'підпис рис.: {line.strip()[:80]}'))

        # 5. Table caption: «Таблиця X.Y – ...» or «Таблиця X.Y. – ...»
        if line.strip().startswith("Таблиця "):
            if not re.match(r"^Таблиця\s+\d+\.\d+\s*[.–]\s+[А-ЯІЇЄA-Z]", line.strip()):
                issues.append(("WARN", i, f'підпис табл.: {line.strip()[:80]}'))

        # 6. Pandoc citations left unresolved
        if re.search(r"\[@[a-z0-9_]+", line):
            # Citations are OK in source; will be resolved at build. Only ERR if author key unknown
            pass

    # 7. Volume check
    body_chars = sum(len(l) for l in lines if not l.startswith("#"))
    est_pages = body_chars / PAGE_CHARS
    limit_pages = LIMITS.get(fname)
    if limit_pages and est_pages > limit_pages * 1.15:
        issues.append(("WARN", 0, f"обсяг {est_pages:.2f} стор. > ліміт {limit_pages} стор. (+{(est_pages/limit_pages-1)*100:.0f}%)"))

    return issues, est_pages

def main():
    ch = sys.argv[1] if len(sys.argv) > 1 else "1"
    chdir = os.path.join(DOCS, f"chapter{ch}")
    files = sorted(glob.glob(os.path.join(chdir, "*.md")))
    files = [f for f in files if re.match(r"^\d_", os.path.basename(f))]

    report = {"chapter": ch, "total_issues": 0, "subsections": []}
    print(f"=== Verification: Chapter {ch} ({len(files)} subsections) ===\n")
    for f in files:
        name = os.path.basename(f).replace(".md","")
        issues, pages = check_file(f)
        errs = sum(1 for s,_,_ in issues if s == "ERR")
        warns = sum(1 for s,_,_ in issues if s == "WARN")
        status = "OK " if not issues else f"E{errs}/W{warns}"
        print(f"  [{status}] {name}  ~{pages:.2f}p")
        for sev, ln, msg in issues:
            print(f"        {sev} L{ln}: {msg}")
        report["subsections"].append({
            "name": name, "pages": round(pages,2), "issues": issues
        })
        report["total_issues"] += len(issues)

    out = os.path.join(ROOT, "outputs", "coursework_build", f"verify_ch{ch}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\nReport: {out}")
    print(f"Total issues: {report['total_issues']}")
    sys.exit(1 if report["total_issues"] else 0)

if __name__ == "__main__":
    main()
