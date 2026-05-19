import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapIcon } from 'lucide-react'

interface ResultsHeaderProps {
  evaluationId: number
  profileName?: string
  executionTimeMs?: number | null
}

export function ResultsHeader({
  evaluationId,
  profileName,
  executionTimeMs,
}: ResultsHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Розрахунок #{evaluationId}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profileName ? `Профіль: ${profileName}` : 'FAHP + TOPSIS'}
          {typeof executionTimeMs === 'number' && (
            <span> · {executionTimeMs} ms</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="default" size="sm">
          <Link to={`/map?evaluationId=${evaluationId}`}>
            <MapIcon className="mr-2 h-4 w-4" />
            Показати на карті
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/results">
            <ArrowLeft className="mr-2 h-4 w-4" />
            До історії
          </Link>
        </Button>
      </div>
    </div>
  )
}
