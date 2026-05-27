import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { exportCsv, exportJson, type CsvCell } from './chartExport'

interface TabularExportButtonsProps {
  // The CSV rows; the first row is the header. The JSON payload is whatever
  // the caller wants persisted — usually a richer object than CSV cells.
  csvRows: ReadonlyArray<ReadonlyArray<CsvCell>>
  jsonData: unknown
  filenameBase: string
  label?: string
}

export function TabularExportButtons({
  csvRows,
  jsonData,
  filenameBase,
  label,
}: TabularExportButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => exportCsv(csvRows, `${filenameBase}.csv`)}
        disabled={csvRows.length === 0}
      >
        <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => exportJson(jsonData, `${filenameBase}.json`)}
      >
        <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        JSON
      </Button>
    </div>
  )
}
