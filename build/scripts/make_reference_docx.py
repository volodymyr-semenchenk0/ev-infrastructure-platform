"""
Produce build/reference.docx for pandoc.

CRITICAL: must base on pandoc's DEFAULT reference doc, not a fresh document.
Why: pandoc uses pStyle "Compact" inside table cells and tblStyle "Table" for
tables. If those styles are missing, tables collapse to a single column.

Generate pandoc's default and patch it:
  pandoc -o /tmp/ref_base.docx --print-default-data-file=reference.docx
"""
import zipfile, shutil, re, os, subprocess, sys

OUT = os.environ.get("OUT", "build/reference.docx")
BASE = "/tmp/_pandoc_ref_base.docx"

# Get pandoc default reference
subprocess.run(["pandoc", "--print-default-data-file=reference.docx"],
               stdout=open(BASE, "wb"), check=True)

with zipfile.ZipFile(BASE) as z:
    styles = z.open("word/styles.xml").read().decode()
    doc_xml = z.open("word/document.xml").read().decode()

# Patch styles ---------------------------------------------------------------

# Normal: Times New Roman 14pt, 1.5 spacing, justify, indent 1.27cm (720 twips)
NORMAL_NEW = '''<w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto"/>
      <w:ind w:firstLine="720"/>
      <w:jc w:val="both"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>'''
styles = re.sub(r'<w:style w:type="paragraph" w:default="1" w:styleId="Normal">.*?</w:style>',
                NORMAL_NEW, styles, count=1, flags=re.DOTALL)

# Compact (used by pandoc for table cells): no extra spacing, no first-line indent
COMPACT_NEW = '''<w:style w:type="paragraph" w:customStyle="1" w:styleId="Compact">
    <w:name w:val="Compact"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>'''
styles = re.sub(r'<w:style w:type="paragraph" w:customStyle="1" w:styleId="Compact">.*?</w:style>',
                COMPACT_NEW, styles, count=1, flags=re.DOTALL)

# Table style — borders all around + insideH/V
TABLE_NEW = '''<w:style w:type="table" w:default="1" w:styleId="Table">
    <w:name w:val="Table"/>
    <w:basedOn w:val="TableNormal"/>
    <w:qFormat/>
    <w:tblPr>
      <w:tblInd w:w="0" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="60" w:type="dxa"/>
        <w:left w:w="108" w:type="dxa"/>
        <w:bottom w:w="60" w:type="dxa"/>
        <w:right w:w="108" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
  </w:style>'''
styles = re.sub(r'<w:style w:type="table" w:default="1" w:styleId="Table">.*?</w:style>',
                TABLE_NEW, styles, count=1, flags=re.DOTALL)

# Headings — per methodology: H1 uppercase centered, H2/H3 normal case with indent
HEADING1_NEW = '''<w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="240" w:after="240" w:line="360" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="center"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:b/><w:caps/><w:sz w:val="28"/>
    </w:rPr>
  </w:style>'''
HEADING2_NEW = '''<w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="180" w:after="120" w:line="360" w:lineRule="auto"/>
      <w:ind w:firstLine="720"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:b/><w:sz w:val="28"/>
    </w:rPr>
  </w:style>'''
HEADING3_NEW = '''<w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="120" w:after="60" w:line="360" w:lineRule="auto"/>
      <w:ind w:firstLine="720"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:b/><w:sz w:val="28"/>
    </w:rPr>
  </w:style>'''

def upsert(s, sid, new):
    pat = re.compile(rf'<w:style[^>]*w:styleId="{sid}"[^>]*>.*?</w:style>', re.DOTALL)
    return pat.sub(new, s) if pat.search(s) else s.replace("</w:styles>", new + "\n</w:styles>")

styles = upsert(styles, "Heading1", HEADING1_NEW)
styles = upsert(styles, "Heading2", HEADING2_NEW)
styles = upsert(styles, "Heading3", HEADING3_NEW)

# Page setup: A4 = 11906 × 16838 twips; margins per methodology
# top=20mm=1134, right=15mm=850, bottom=20mm=1134, left=25mm=1417
SECT_NEW = ('<w:sectPr>'
            '<w:pgSz w:w="11906" w:h="16838"/>'
            '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1417" '
            'w:header="708" w:footer="708" w:gutter="0"/>'
            '<w:cols w:space="708"/>'
            '<w:docGrid w:linePitch="360"/>'
            '</w:sectPr>')
doc_xml = re.sub(r'<w:sectPr>.*?</w:sectPr>', SECT_NEW, doc_xml, flags=re.DOTALL)

# Save patched docx
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with zipfile.ZipFile(BASE) as zin, zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        if item.filename == "word/styles.xml":
            zout.writestr(item, styles)
        elif item.filename == "word/document.xml":
            zout.writestr(item, doc_xml)
        else:
            zout.writestr(item, zin.read(item.filename))

print(f"reference.docx saved: {OUT}  ({os.path.getsize(OUT)} bytes)")
