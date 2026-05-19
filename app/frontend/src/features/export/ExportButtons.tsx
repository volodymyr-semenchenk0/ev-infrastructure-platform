import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api'

interface ExportButtonsProps {
  evaluationId: number
  label?: string
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
}

function exportUrl(evaluationId: number, format: 'csv' | 'json'): string {
  return `${API_BASE_URL}/evaluations/${evaluationId}/export?format=${format}`
}

export function ExportButtons({
  evaluationId,
  label,
  size = 'sm',
  variant = 'outline',
}: ExportButtonsProps) {
  const prefix = label ? `${label} ` : ''
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant={variant} size={size}>
        <a
          href={exportUrl(evaluationId, 'csv')}
          download={`evaluation-${evaluationId}.csv`}
        >
          <Download className="mr-2 h-4 w-4" />
          {prefix}CSV
        </a>
      </Button>
      <Button asChild variant={variant} size={size}>
        <a
          href={exportUrl(evaluationId, 'json')}
          download={`evaluation-${evaluationId}.json`}
        >
          <Download className="mr-2 h-4 w-4" />
          {prefix}JSON
        </a>
      </Button>
    </div>
  )
}
