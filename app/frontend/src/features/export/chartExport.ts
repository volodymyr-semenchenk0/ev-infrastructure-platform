// Browser-only export helpers for UI_PLAN §5.4.5. Tabular data goes out as
// CSV/JSON; SVG charts (Nivo renders SVG under the hood) go out as SVG or
// PNG. No new dependencies — PNG rasterisation uses the platform <canvas>
// and an <img> bridge instead of dom-to-image so the bundle stays lean.

export type CsvCell = string | number | null | undefined

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Release the object URL once the click event has been dispatched. The
  // browser keeps the blob alive long enough for the download to complete.
  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'number' ? String(value) : value
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Returns a CSV string built from `rows`. The first row is the header.
// Numbers keep their JS toString form; null/undefined become empty cells.
export function rowsToCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
}

// Excel chokes on UTF-8 without a BOM; we prepend U+FEFF so Cyrillic column
// headers render correctly when the file is opened directly. Encoded as a
// hex escape so ESLint's no-irregular-whitespace stays happy.
const UTF8_BOM = '\uFEFF'

export function exportCsv(
  rows: ReadonlyArray<ReadonlyArray<CsvCell>>,
  filename: string,
): void {
  const csv = `${UTF8_BOM}${rowsToCsv(rows)}`
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
}

export function exportJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json' }), filename)
}

// Clone the SVG, inline its computed sizes, and serialise to a Blob.
function serialiseSvg(svg: SVGElement): { source: string; width: number; height: number } {
  const clone = svg.cloneNode(true) as SVGElement
  // Nivo measures its container at runtime and writes width/height via the
  // SVG element style; we need them on the attribute side for the file to
  // render outside the browser. Fall back to bounding-box dimensions when
  // the attributes are missing.
  const rect = svg.getBoundingClientRect()
  const width = svg.getAttribute('width')
    ? Number.parseFloat(svg.getAttribute('width') as string)
    : rect.width
  const height = svg.getAttribute('height')
    ? Number.parseFloat(svg.getAttribute('height') as string)
    : rect.height
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  const source = new XMLSerializer().serializeToString(clone)
  return { source, width, height }
}

export function exportSvg(svg: SVGElement, filename: string): void {
  const { source } = serialiseSvg(svg)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${source}`
  downloadBlob(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), filename)
}

// Rasterise the SVG by drawing it into a <canvas> via an <img> bridge.
// Returns a promise so the caller can await the file generation, but the
// download itself fires from the resolved handler.
export async function exportPng(svg: SVGElement, filename: string): Promise<void> {
  const { source, width, height } = serialiseSvg(svg)
  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Не вдалося завантажити SVG для PNG-експорту'))
      img.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    // Bump pixel density a bit so PNGs do not look blurry when used in a
    // print-friendly version of the coursework.
    const scale = 2
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context недоступний')
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, width, height)

    await new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Не вдалося згенерувати PNG'))
          return
        }
        downloadBlob(blob, filename)
        resolve()
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
