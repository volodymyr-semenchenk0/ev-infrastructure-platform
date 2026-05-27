import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { exportCsv, exportJson, rowsToCsv } from './chartExport'

const originalCreate = URL.createObjectURL
const originalRevoke = URL.revokeObjectURL
const originalBlob = globalThis.Blob

interface CapturedDownload {
  filename: string
  text: string
  type: string
}

function partsToText(parts: BlobPart[] | undefined): string {
  if (!parts) return ''
  let out = ''
  for (const part of parts) {
    if (typeof part === 'string') {
      out += part
    } else if (part instanceof Uint8Array) {
      out += new TextDecoder().decode(part)
    } else if (part instanceof ArrayBuffer) {
      out += new TextDecoder().decode(new Uint8Array(part))
    }
  }
  return out
}

function installDownloadSpy(): {
  captured: CapturedDownload[]
  restore: () => void
} {
  const captured: CapturedDownload[] = []

  // Stash the captured text alongside each Blob so the click handler can
  // retrieve it. jsdom's Blob does not implement .text() or .arrayBuffer(),
  // so we read the constructor parts directly.
  const textByBlob = new WeakMap<Blob, string>()

  class CapturingBlob extends originalBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options)
      textByBlob.set(this, partsToText(parts))
    }
  }
  globalThis.Blob = CapturingBlob as unknown as typeof Blob

  const blobsByUrl = new Map<string, Blob>()
  const create = vi.fn<(blob: Blob) => string>((blob: Blob) => {
    const url = `blob:${Math.random().toString(36).slice(2)}`
    blobsByUrl.set(url, blob)
    return url
  })
  const revoke = vi.fn<(url: string) => void>((url: string) => {
    blobsByUrl.delete(url)
  })
  URL.createObjectURL = create as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = revoke as unknown as typeof URL.revokeObjectURL

  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      const url = this.getAttribute('href') ?? ''
      const filename = this.getAttribute('download') ?? ''
      const blob = blobsByUrl.get(url)
      if (blob) {
        captured.push({
          filename,
          text: textByBlob.get(blob) ?? '',
          type: blob.type,
        })
      }
    })

  return {
    captured,
    restore: () => {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      globalThis.Blob = originalBlob
      click.mockRestore()
    },
  }
}

describe('rowsToCsv', () => {
  it('joins cells with commas and rows with newlines', () => {
    const csv = rowsToCsv([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(csv).toBe('a,b\n1,2')
  })

  it('quotes cells that contain commas, quotes, or newlines', () => {
    const csv = rowsToCsv([
      ['hello, world', 'has "quotes"', 'multi\nline'],
    ])
    expect(csv).toBe('"hello, world","has ""quotes""","multi\nline"')
  })

  it('renders numbers without quoting and nulls as empty', () => {
    const csv = rowsToCsv([
      [1, 2.5, null, undefined, ''],
    ])
    expect(csv).toBe('1,2.5,,,')
  })
})

describe('exportCsv', () => {
  let spy: ReturnType<typeof installDownloadSpy>

  beforeEach(() => {
    spy = installDownloadSpy()
  })

  afterEach(() => {
    spy.restore()
  })

  it('downloads a UTF-8 BOM CSV file with the given filename', () => {
    exportCsv(
      [
        ['code', 'value'],
        ['A', 0.5],
      ],
      'weights.csv',
    )
    expect(spy.captured).toHaveLength(1)
    const { filename, text, type } = spy.captured[0]
    expect(filename).toBe('weights.csv')
    expect(type).toBe('text/csv;charset=utf-8')
    expect(text.startsWith('\uFEFF')).toBe(true)
    expect(text).toContain('code,value')
    expect(text).toContain('A,0.5')
  })
})

describe('exportJson', () => {
  let spy: ReturnType<typeof installDownloadSpy>

  beforeEach(() => {
    spy = installDownloadSpy()
  })

  afterEach(() => {
    spy.restore()
  })

  it('downloads a pretty-printed JSON file', () => {
    exportJson({ a: 1, b: [2, 3] }, 'payload.json')
    expect(spy.captured).toHaveLength(1)
    const { filename, text, type } = spy.captured[0]
    expect(filename).toBe('payload.json')
    expect(type).toBe('application/json')
    expect(JSON.parse(text)).toEqual({ a: 1, b: [2, 3] })
    expect(text).toContain('\n')
  })
})
