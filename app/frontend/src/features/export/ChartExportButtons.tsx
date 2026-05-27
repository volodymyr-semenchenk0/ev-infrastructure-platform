import { type RefObject, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'

import { exportPng, exportSvg } from './chartExport'

interface ChartExportButtonsProps {
  // Container that wraps the chart; the first <svg> descendant is the
  // export target. Nivo's responsive containers render a single SVG so this
  // picks up the right element across all current chart types.
  containerRef: RefObject<HTMLElement | null>
  filenameBase: string
  label?: string
}

function pickSvg(container: HTMLElement | null): SVGElement | null {
  if (!container) return null
  return container.querySelector('svg')
}

export function ChartExportButtons({
  containerRef,
  filenameBase,
  label,
}: ChartExportButtonsProps) {
  const [pendingFormat, setPendingFormat] = useState<'png' | 'svg' | null>(null)

  const run = async (format: 'png' | 'svg') => {
    const svg = pickSvg(containerRef.current)
    if (!svg) {
      toast({
        title: 'Експорт недоступний',
        description: 'Діаграма ще не відрендерилася.',
        variant: 'destructive',
      })
      return
    }
    setPendingFormat(format)
    try {
      const filename = `${filenameBase}.${format}`
      if (format === 'svg') {
        exportSvg(svg, filename)
      } else {
        await exportPng(svg, filename)
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Помилка експорту'
      toast({ title: 'Експорт не вдався', description, variant: 'destructive' })
    } finally {
      setPendingFormat(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void run('png')}
        disabled={pendingFormat !== null}
      >
        {pendingFormat === 'png' ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        )}
        PNG
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void run('svg')}
        disabled={pendingFormat !== null}
      >
        <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        SVG
      </Button>
    </div>
  )
}
