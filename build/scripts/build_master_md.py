#!/usr/bin/env python3
"""
Assemble build/master.md from all docs/ markdown sources.

Steps:
  1. Collect files in document order (вступ → ch1 → ch2 → ch3 → висновки
     → список_джерел → appendices).
  2. Build a citation map {@key → N} by scanning text in document order.
  3. For each file: strip editorial blockquotes, plantuml fences,
     fix LaTeX for pandoc OMML, resolve citations, wrap figures/captions/
     table-captions with custom-style divs.
  4. Normalize top-level headings (ВСТУП, ВИСНОВКИ → # heading).
  5. Write build/master.md.

Usage (from repo root):
    REPO_ROOT=<path> python3 build/scripts/build_master_md.py
"""
import json
import os
import re
from pathlib import Path

ROOT = Path(os.environ.get("REPO_ROOT", Path(__file__).parent.parent.parent))
DOCS  = ROOT / "docs"
BUILD = ROOT / "build"

# ── File collection ──────────────────────────────────────────────────────────

def collect_files() -> list[tuple[str, Path]]:
    """Return ordered [(label, Path)] list of all source files."""
    items: list[tuple[str, Path]] = []

    def _add(label: str, path: Path):
        if path.exists():
            items.append((label, path))
        else:
            print(f"  WARNING: {path} not found – skipping")

    _add("вступ", DOCS / "вступ.md")

    for ch in (1, 2, 3):
        ch_dir = DOCS / f"chapter{ch}"
        if ch_dir.exists():
            md_files = sorted(
                (f for f in ch_dir.glob("*.md") if re.match(r"^\d", f.name)),
                key=lambda p: p.name,
            )
            for f in md_files:
                items.append((f.stem, f))

    _add("висновки",       DOCS / "висновки.md")
    _add("список_джерел",  DOCS / "список_джерел.md")

    app_dir = DOCS / "appendices"
    if app_dir.exists():
        for f in sorted(app_dir.glob("*.md"), key=lambda p: p.name):
            items.append((f.stem, f))

    return items


# ── Citation map ─────────────────────────────────────────────────────────────
# Matches [@key], [@key, с. 24], [@key1; @key2] etc.
_CITE_KEY_RE = re.compile(r"@([\w_:./-]+)")


def build_citation_map(sections: list[tuple[str, Path]]) -> dict[str, int]:
    """
    Scan document text in order and assign sequential numbers to BibTeX keys
    by first appearance.  Skip the bibliography file itself.
    """
    order: dict[str, int] = {}
    n = 0
    skip_labels = {"список_джерел"}
    for label, path in sections:
        if label in skip_labels:
            continue
        text = path.read_text(encoding="utf-8")
        for m in _CITE_KEY_RE.finditer(text):
            key = m.group(1)
            if key not in order:
                n += 1
                order[key] = n
    return order


# ── Preprocessing helpers ────────────────────────────────────────────────────

def strip_blockquote_notes(text: str) -> str:
    """Remove editorial blockquote lines (> ...) from the top of a file."""
    lines = text.splitlines(keepends=True)
    result = []
    skipping = True
    for line in lines:
        if skipping and line.startswith(">"):
            continue
        else:
            skipping = False
            result.append(line)
    return "".join(result)


def strip_plantuml(text: str) -> str:
    """Remove ```plantuml … ``` fenced blocks."""
    return re.sub(r"```plantuml\b.*?```", "", text, flags=re.DOTALL)


def strip_horizontal_rules(text: str) -> str:
    """
    Remove bare '---' divider lines used as editorial separators in the
    source.  Keep them only if they are part of YAML front-matter (not
    applicable here) – simple rule: remove any paragraph that is exactly
    three or more dashes.
    """
    return re.sub(r"(?m)^-{3,}\s*$", "", text)


def fix_formulas(text: str) -> str:
    r"""
    Prepare LaTeX for pandoc's OMML converter.
    Inside $$ ... $$ blocks:
      - Strip \tag{...}   (numbering is inline text after the block)
      - Replace \!        (negative thin space – unsupported by pandoc OMML)
      - Replace \,        (thin space – replace with regular space is safe)
      - \mathbb{X} → \mathbf{X}
    Inline $ ... $: only \mathbb fix.
    """
    def _fix_display(m: re.Match) -> str:
        body = m.group(1)
        body = re.sub(r"\\tag\{[^}]*\}", "", body)
        body = body.replace(r"\!", " ")
        body = re.sub(r"\\mathbb\{([^}]*)\}", r"\\mathbf{\1}", body)
        return f"$$\n{body.strip()}\n$$"

    text = re.sub(r"\$\$(.*?)\$\$", _fix_display, text, flags=re.DOTALL)

    def _fix_inline(m: re.Match) -> str:
        body = re.sub(r"\\mathbb\{([^}]*)\}", r"\\mathbf{\1}", m.group(1))
        return f"${body}$"

    text = re.sub(r"\$([^$\n]+)\$", _fix_inline, text)
    return text


# ── Citation replacement ─────────────────────────────────────────────────────
# Bracket-content that contains at least one @key
_CITE_BLOCK_RE = re.compile(r"\[([^\[\]]*@[^\[\]]*)\]")


def resolve_citations(text: str, cmap: dict[str, int]) -> str:
    """
    Replace pandoc [@key] / [@key, с. 24] / [@k1; @k2] with [N] / [N, с. 24].
    Keys not in cmap get placeholder [?key] to be visible in output.
    """
    def _replace(m: re.Match) -> str:
        inner = m.group(1)
        parts = [p.strip() for p in inner.split(";")]
        nums: list[str] = []
        suffix = ""
        for part in parts:
            km = re.match(r"@([\w_:./-]+)(.*)", part)
            if km:
                key = km.group(1)
                tail = km.group(2).strip()
                nums.append(str(cmap.get(key, f"?{key}")))
                if tail and not suffix:
                    suffix = tail
            elif part and not suffix:
                suffix = part
        combined = ", ".join(nums)
        if suffix:
            combined = f"{combined}{suffix}"
        return f"[{combined}]"

    return _CITE_BLOCK_RE.sub(_replace, text)


# ── Figure / caption wrapping ────────────────────────────────────────────────
# Bracket-balanced image regex: alt text may contain [brackets]
_IMG_RE = re.compile(r"!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)]+)\)")

# Caption line: «Рис. 1.2. Назва»
_CAP_RE = re.compile(r"^Рис\.\s+\d+\.\d+[. ]")

# Table caption: «Таблиця 1.2. – Назва» or «Таблиця 1.2 –»
_TAB_CAP_RE = re.compile(r"^Таблиця\s+\d+\.\d+")


def wrap_figures_and_captions(text: str) -> str:
    """
    Wrap standalone image paragraphs with {custom-style="Figure"} fenced div.
    Wrap Рис. caption lines with {custom-style="Caption"} fenced div.
    Blank line before figure and after caption caption are preserved.
    """
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Standalone image paragraph
        if _IMG_RE.fullmatch(stripped):
            if out and out[-1].strip() != "":
                out.append("")
            out.append('::: {custom-style="Figure"}')
            out.append(stripped)
            out.append(":::")
            i += 1
            continue

        # Figure caption
        if _CAP_RE.match(stripped):
            out.append('::: {custom-style="Caption"}')
            out.append(stripped)
            out.append(":::")
            out.append("")       # blank line after caption
            i += 1
            continue

        out.append(line)
        i += 1
    return "\n".join(out)


def wrap_table_captions(text: str) -> str:
    """
    Wrap «Таблиця X.Y. – …» lines with {custom-style="TableCaption"} div.
    Adds blank line before the caption.
    """
    lines = text.split("\n")
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if _TAB_CAP_RE.match(stripped):
            if out and out[-1].strip() != "":
                out.append("")
            out.append('::: {custom-style="TableCaption"}')
            out.append(stripped)
            out.append(":::")
        else:
            out.append(line)
    return "\n".join(out)


# ── Heading normalization ────────────────────────────────────────────────────

_UNNUMBERED = ("ВСТУП", "ВИСНОВКИ", "СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ", "ДОДАТКИ")


def normalize_headings(text: str) -> str:
    """
    Ensure unnumbered structural headings (ВСТУП, ВИСНОВКИ, etc.) are at #
    level so pandoc maps them to Heading 1 (centered, uppercase, page break).
    """
    for title in _UNNUMBERED:
        pattern = rf"^#{{{1,3}}}\s+({re.escape(title)})\s*$"
        text = re.sub(pattern, r"# \1", text, flags=re.MULTILINE)
    return text


# ── Per-file processor ───────────────────────────────────────────────────────

def rewrite_image_paths(text: str, file_path: Path) -> str:
    """
    Rewrite relative image paths to paths relative to the repo root so that
    pandoc (running from the repo root) can locate the files.

    e.g. images/fig_1_1.png  →  docs/chapter1/images/fig_1_1.png
    """
    img_dir = file_path.parent  # e.g. docs/chapter1/
    try:
        img_dir_rel = img_dir.relative_to(ROOT)
    except ValueError:
        return text  # path not under ROOT – leave as-is

    def _rewrite(m: re.Match) -> str:
        alt  = m.group(1)
        href = m.group(2)
        # Only rewrite relative (non-absolute, non-URL) paths
        if not href.startswith(("/", "http://", "https://")):
            href = str(img_dir_rel / href)
        return f"![{alt}]({href})"

    # Use bracket-balanced regex so alt text with [brackets] is handled
    return _IMG_RE.sub(_rewrite, text)


def process_file(path: Path, cmap: dict[str, int]) -> str:
    text = path.read_text(encoding="utf-8")
    text = strip_blockquote_notes(text)
    text = strip_plantuml(text)
    text = strip_horizontal_rules(text)
    text = fix_formulas(text)
    text = rewrite_image_paths(text, path)
    text = resolve_citations(text, cmap)
    text = wrap_figures_and_captions(text)
    text = wrap_table_captions(text)
    text = normalize_headings(text)
    return text.strip()


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    sections = collect_files()
    print(f"Collected {len(sections)} source sections:")
    for label, path in sections:
        print(f"  [{label}] {path.relative_to(ROOT)}")

    print("\nBuilding citation map (scan order = document order)...")
    cmap = build_citation_map(sections)
    print(f"  {len(cmap)} unique citation keys")

    BUILD.mkdir(parents=True, exist_ok=True)
    cmap_path = BUILD / "citations_map.json"
    cmap_path.write_text(
        json.dumps(cmap, ensure_ascii=False, indent=2, sort_keys=False),
        encoding="utf-8",
    )
    print(f"  Saved: {cmap_path}")

    print("\nPreprocessing files and assembling master.md...")
    parts: list[str] = []
    for label, path in sections:
        content = process_file(path, cmap)
        if content:
            parts.append(content)
        else:
            print(f"  WARNING: {label} produced empty content")

    master = "\n\n".join(parts)

    master_path = BUILD / "master.md"
    master_path.write_text(master, encoding="utf-8")
    chars = len(master)
    # Rough page estimate: 14pt TNR 1.5 spacing ≈ 1 900 chars/page
    pages = chars / 1900
    print(f"  Saved: {master_path}")
    print(f"  {chars:,} chars  ≈ {pages:.0f} pages (target 40–50 pp. excl. appendices)")

    # Warn if unresolved citation keys remain
    unresolved = re.findall(r"\[\?[\w_:./-]+\]", master)
    if unresolved:
        print(f"\n  WARNING: {len(unresolved)} unresolved citations: {set(unresolved)}")
    else:
        print("  All citations resolved.")

    print("\nDone. Run:  bash build/scripts/build_docx.sh")


if __name__ == "__main__":
    main()
