import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/store/profile-store'
import { useEvaluationsHistory } from '@/store/evaluations-history'
import { useCriteria } from '@/features/calculate/useCriteria'
import { AhpMatrix } from '@/features/calculate/AhpMatrix'
import { ConsistencyBadge } from '@/features/calculate/ConsistencyBadge'
import { computeCR } from '@/features/calculate/consistency'
import { identityMatrix, type PairwiseMatrix } from '@/features/calculate/saaty-scale'
import { useCreateEvaluation } from '@/features/calculate/useCreateEvaluation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { Loader2, Calculator } from 'lucide-react'
import { ValidationError } from '@/lib/api'

export function CalculatePage() {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const navigate = useNavigate()
  const criteria = useCriteria()
  const createEvaluation = useCreateEvaluation()
  const [matrix, setMatrix] = useState<PairwiseMatrix | null>(null)

  // Initialise identity matrix once criteria load.
  const initialMatrix = useMemo(() => {
    if (!criteria.data) return null
    return identityMatrix(criteria.data.length)
  }, [criteria.data])

  const effectiveMatrix = matrix ?? initialMatrix
  const cr = effectiveMatrix ? computeCR(effectiveMatrix) : 0

  if (!activeProfile) {
    return <Navigate to="/profile" replace />
  }

  const handleSubmit = () => {
    if (!effectiveMatrix) return
    createEvaluation.mutate(
      {
        profileId: activeProfile.id,
        pairwiseMatrix: effectiveMatrix,
      },
      {
        onSuccess: (data) => {
          useEvaluationsHistory.getState().pushEvaluation({
            id: data.evaluationId,
            profileName: activeProfile.name,
            profileCode: activeProfile.code,
            createdAt: new Date().toISOString(),
          })
          navigate(`/results/${data.evaluationId}`)
        },
        onError: (error) => {
          const description =
            error instanceof ValidationError
              ? error.detail
              : (error as Error).message || 'Не вдалося обчислити ранжування'
          toast({ title: 'Помилка', description, variant: 'destructive' })
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Розрахунок FAHP + TOPSIS</h1>
          <p className="mt-2 text-muted-foreground">
            Профіль: <span className="font-medium text-foreground">{activeProfile.name}</span>
          </p>
        </div>
        {effectiveMatrix && <ConsistencyBadge cr={cr} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Матриця попарних порівнянь критеріїв</CardTitle>
        </CardHeader>
        <CardContent>
          {criteria.isLoading || !effectiveMatrix ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <AhpMatrix
              criteria={criteria.data ?? []}
              matrix={effectiveMatrix}
              onChange={setMatrix}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {createEvaluation.isPending && (
          <span className="text-sm text-muted-foreground">Обчислення…</span>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!effectiveMatrix || cr > 0.1 || createEvaluation.isPending}
        >
          {createEvaluation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="mr-2 h-4 w-4" />
          )}
          Обчислити ранжування
        </Button>
      </div>
    </div>
  )
}
