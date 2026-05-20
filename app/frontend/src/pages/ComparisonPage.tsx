import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, GitCompare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { NotFoundError } from '@/lib/api'
import { useEvaluation } from '@/features/results/useEvaluation'
import { useEvaluationsHistory } from '@/store/evaluations-history'
import { useLocations } from '@/features/locations/useLocations'
import { ExportButtons } from '@/features/export/ExportButtons'

import { DiffTable } from '@/features/comparison/DiffTable'
import { GroupedBarChart } from '@/features/comparison/GroupedBarChart'
import { SpearmanBadge } from '@/features/comparison/SpearmanBadge'
import { useComparison } from '@/features/comparison/useComparison'

function parseId(raw: string | null): number | null {
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function ComparisonPage() {
  const recent = useEvaluationsHistory((s) => s.recent)
  const locations = useLocations()
  const [params, setParams] = useSearchParams()

  // URL is the source of truth for the active pair; the form holds the
  // "pending" selection until the user clicks «Порівняти».
  const aFromUrl = parseId(params.get('a'))
  const bFromUrl = parseId(params.get('b'))
  const [draftA, setDraftA] = useState<string>(aFromUrl ? String(aFromUrl) : '')
  const [draftB, setDraftB] = useState<string>(bFromUrl ? String(bFromUrl) : '')

  useEffect(() => {
    setDraftA(aFromUrl ? String(aFromUrl) : '')
    setDraftB(bFromUrl ? String(bFromUrl) : '')
  }, [aFromUrl, bFromUrl])

  const evaluationA = useEvaluation(aFromUrl ?? 0)
  const evaluationB = useEvaluation(bFromUrl ?? 0)
  const comparison = useComparison(aFromUrl, bFromUrl)

  useEffect(() => {
    const err =
      evaluationA.error instanceof NotFoundError
        ? aFromUrl
        : evaluationB.error instanceof NotFoundError
          ? bFromUrl
          : comparison.error instanceof NotFoundError
            ? (aFromUrl ?? bFromUrl)
            : null
    if (err) {
      toast({
        title: 'Розрахунок не знайдено',
        description: `Evaluation #${err}`,
        variant: 'destructive',
      })
      const next = new URLSearchParams(params)
      next.delete('a')
      next.delete('b')
      setParams(next, { replace: true })
    }
  }, [
    evaluationA.error,
    evaluationB.error,
    comparison.error,
    aFromUrl,
    bFromUrl,
    params,
    setParams,
  ])

  const nameByLocationId = useMemo<Record<number, string>>(() => {
    if (!locations.data) return {}
    return Object.fromEntries(locations.data.map((l) => [l.id, l.name]))
  }, [locations.data])

  const rankingPairs = useMemo(() => {
    if (!evaluationA.data || !evaluationB.data) return []
    const aMap = new Map(evaluationA.data.ranking.map((r) => [r.locationId, r.rank]))
    return evaluationB.data.ranking
      .map((r) => ({
        locationId: r.locationId,
        rankA: aMap.get(r.locationId) ?? Number.NaN,
        rankB: r.rank,
      }))
      .filter((p) => Number.isFinite(p.rankA))
      .sort((p1, p2) => p1.rankA - p2.rankA)
  }, [evaluationA.data, evaluationB.data])

  const applyDraft = useCallback(() => {
    if (!draftA || !draftB || draftA === draftB) return
    const next = new URLSearchParams(params)
    next.set('a', draftA)
    next.set('b', draftB)
    setParams(next)
  }, [draftA, draftB, params, setParams])

  const compareDisabled =
    !draftA || !draftB || draftA === draftB || comparison.isFetching

  if (recent.length < 2) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Порівняння розрахунків</h1>
          <p className="mt-2 text-muted-foreground">
            Для порівняння потрібно щонайменше два розрахунки в історії сесії.
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Зробіть кілька розрахунків з різними матрицями попарних порівнянь,
            потім поверніться сюди.
            <div className="mt-4">
              <Button asChild>
                <Link to="/calculate">Перейти до розрахунку</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Порівняння розрахунків</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spearman ρ + матриця змін рангів + grouped bar chart
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/results">
            <ArrowLeft className="mr-2 h-4 w-4" />
            До історії
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Оберіть два розрахунки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="select-a">Розрахунок A</Label>
              <Select value={draftA} onValueChange={setDraftA}>
                <SelectTrigger id="select-a">
                  <SelectValue placeholder="Оберіть розрахунок" />
                </SelectTrigger>
                <SelectContent>
                  {recent.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      #{item.id} · {item.profileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="select-b">Розрахунок B</Label>
              <Select value={draftB} onValueChange={setDraftB}>
                <SelectTrigger id="select-b">
                  <SelectValue placeholder="Оберіть розрахунок" />
                </SelectTrigger>
                <SelectContent>
                  {recent.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      #{item.id} · {item.profileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {draftA && draftB && draftA === draftB
                ? 'Оберіть два РІЗНІ розрахунки.'
                : 'Розрахунки можуть мати різні профілі ОПР.'}
            </p>
            <Button onClick={applyDraft} disabled={compareDisabled}>
              <GitCompare className="mr-2 h-4 w-4" />
              Порівняти
            </Button>
          </div>
        </CardContent>
      </Card>

      {aFromUrl && bFromUrl && comparison.isFetching && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-72" />
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {comparison.data && evaluationA.data && evaluationB.data && (
        <>
          <SpearmanBadge rho={comparison.data.spearmanRho} />

          <Card>
            <CardHeader>
              <CardTitle>Порівняння рангів</CardTitle>
            </CardHeader>
            <CardContent>
              <GroupedBarChart
                rankings={rankingPairs}
                nameByLocationId={nameByLocationId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Локації, які змінили позицію</CardTitle>
            </CardHeader>
            <CardContent>
              <DiffTable
                differences={comparison.data.pairwiseDifferences}
                nameByLocationId={nameByLocationId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Експорт</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-[7rem] text-sm text-muted-foreground">
                  Розрахунок A:
                </span>
                <ExportButtons evaluationId={aFromUrl as number} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-[7rem] text-sm text-muted-foreground">
                  Розрахунок B:
                </span>
                <ExportButtons evaluationId={bFromUrl as number} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
