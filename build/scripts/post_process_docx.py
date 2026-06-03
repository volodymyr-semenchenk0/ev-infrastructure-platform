#!/usr/bin/env python3
"""
Post-process the pandoc-generated docx:
  - Add single black borders to every table cell.
  - Add small inner padding to every table cell so text does not touch borders.
  - Remove conditional-formatting table-look overrides that can suppress borders.

Why post-process instead of patching the Table style in reference.docx:
  pandoc may emit an empty <w:tblBorders/> in each table's tblPr that overrides
  the style-level borders.  Setting borders and margins directly on the cells is
  the only reliable way to ensure they appear regardless of pandoc version.

Usage (from repo root):
    IN=<path-to-docx> REPO_ROOT=<path> python3 build/scripts/post_process_docx.py
"""
import os
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ROOT    = Path(os.environ.get("REPO_ROOT", Path(__file__).parent.parent.parent))
IN_PATH = Path(os.environ.get("IN", ROOT / "build" / "EV_charging_DSS_coursework.docx"))

# ── Border settings ──────────────────────────────────────────────────────────
# sz is in eighths-of-a-point: sz=4 → 0.5 pt (standard thin border)
BORDER_SZ    = "4"
BORDER_COLOR = "000000"

# ── Cell margin settings (dxa = twentieths-of-a-point) ──────────────────────
# 1 mm ≈ 57 dxa  |  2 mm ≈ 113 dxa
CELL_TOP_BOT = "57"   # 1 mm  – top and bottom inner padding
CELL_LEFT_RT = "113"  # 2 mm  – left and right inner padding

# ── XML helpers ──────────────────────────────────────────────────────────────

def _find(el, tag: str):
    return el.find(qn(tag))


def _ensure(el, tag: str):
    child = _find(el, tag)
    if child is None:
        child = OxmlElement(tag)
        el.append(child)
    return child


def _clear(el, tag: str):
    for c in list(el.findall(qn(tag))):
        el.remove(c)


def _border_el(side: str) -> OxmlElement:
    b = OxmlElement(f"w:{side}")
    b.set(qn("w:val"),   "single")
    b.set(qn("w:sz"),    BORDER_SZ)
    b.set(qn("w:space"), "0")
    b.set(qn("w:color"), BORDER_COLOR)
    return b


# ── Per-table processing ─────────────────────────────────────────────────────

def process_table(table) -> None:
    tbl   = table._tbl
    tblPr = _ensure(tbl, "w:tblPr")

    # 1. Table-level: replace tblBorders with explicit borders on all six sides
    _clear(tblPr, "w:tblBorders")
    borders_el = OxmlElement("w:tblBorders")
    for side in ("top", "left", "bottom", "right", "insideH", "insideV"):
        borders_el.append(_border_el(side))
    tblPr.append(borders_el)

    # 2. Table-level: set default cell margins (some cells may override below)
    _clear(tblPr, "w:tblCellMar")
    mar_el = OxmlElement("w:tblCellMar")
    for side, val in (
        ("top",    CELL_TOP_BOT),
        ("left",   CELL_LEFT_RT),
        ("bottom", CELL_TOP_BOT),
        ("right",  CELL_LEFT_RT),
    ):
        m = OxmlElement(f"w:{side}")
        m.set(qn("w:w"),    val)
        m.set(qn("w:type"), "dxa")
        mar_el.append(m)
    tblPr.append(mar_el)

    # 3. Disable tblLook conditional-formatting overrides that can hide borders
    _clear(tblPr, "w:tblLook")
    look = OxmlElement("w:tblLook")
    look.set(qn("w:val"),        "0000")
    look.set(qn("w:firstRow"),   "0")
    look.set(qn("w:lastRow"),    "0")
    look.set(qn("w:firstColumn"),"0")
    look.set(qn("w:lastColumn"), "0")
    look.set(qn("w:noHBand"),    "0")
    look.set(qn("w:noVBand"),    "0")
    tblPr.append(look)

    # 4. Cell-level: explicit borders and margins on every cell
    for row in table.rows:
        for cell in row.cells:
            tc   = cell._tc
            tcPr = _ensure(tc, "w:tcPr")

            # Borders (four sides; no insideH/V at cell level)
            _clear(tcPr, "w:tcBorders")
            cell_borders = OxmlElement("w:tcBorders")
            for side in ("top", "left", "bottom", "right"):
                cell_borders.append(_border_el(side))
            tcPr.append(cell_borders)

            # Inner padding
            _clear(tcPr, "w:tcMar")
            tc_mar = OxmlElement("w:tcMar")
            for side, val in (
                ("top",    CELL_TOP_BOT),
                ("left",   CELL_LEFT_RT),
                ("bottom", CELL_TOP_BOT),
                ("right",  CELL_LEFT_RT),
            ):
                m = OxmlElement(f"w:{side}")
                m.set(qn("w:w"),    val)
                m.set(qn("w:type"), "dxa")
                tc_mar.append(m)
            tcPr.append(tc_mar)


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    doc    = Document(str(IN_PATH))
    tables = doc.tables
    print(f"Post-processing {IN_PATH.name}: {len(tables)} table(s)")

    for table in tables:
        process_table(table)

    doc.save(str(IN_PATH))
    print(f"  Done: {IN_PATH}")


if __name__ == "__main__":
    main()
