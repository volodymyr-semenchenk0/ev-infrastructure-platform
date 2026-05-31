import { useRef, type ReactNode } from 'react'

import { ChartExportButtons } from './ChartExportButtons'

interface ChartCardProps {
  title: string
  filenameBase: string
  // Extra header control rendered left of the export buttons (e.g. a location
  // selector). Only the chart body — not these controls — is exported.
  controls?: ReactNode
  children: ReactNode
}

// Shared wrapper for every chart: a bordered, rounded container with a header
// row (title left, optional controls + PNG/SVG export right) and a ref'd body
// holding the chart itself. The body ref is what the export captures.
export function ChartCard({ title, filenameBase, controls, children }: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          <ChartExportButtons containerRef={ref} filenameBase={filenameBase} />
        </div>
      </div>
      <div ref={ref}>{children}</div>
    </div>
  )
}
