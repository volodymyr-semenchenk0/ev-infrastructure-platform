import { useMemo } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

import { useCriteria } from '@/features/calculate/useCriteria'
import { useLocations } from '@/features/locations/useLocations'
import { LocationMap, type RankInfo } from '@/features/map/LocationMap'
import { useSessionStore } from '@/store/session-store'

// MapPane fills the right half of the workbench. Ranking colouring is wired
// in task 9; for now `rankByLocationId` stays empty whenever the session
// store has no ranking yet, so markers render in the neutral colour from
// `marker-color.ts`.
export function MapPane() {
  const locations = useLocations()
  const criteria = useCriteria()
  const ranking = useSessionStore((s) => s.ranking)

  const rankByLocationId = useMemo<Map<number, RankInfo>>(() => {
    if (!ranking) return new Map()
    return new Map(
      ranking.map((item) => [
        item.locationId,
        { rank: item.rank, closeness: item.closeness },
      ]),
    )
  }, [ranking])

  const isLoading = locations.isLoading || criteria.isLoading
  const isError = locations.isError || criteria.isError
  const hasData = (locations.data?.length ?? 0) > 0 && (criteria.data?.length ?? 0) >= 0

  return (
    <section
      aria-label="Карта локацій-кандидатів"
      className="relative flex flex-1 items-stretch bg-muted"
    >
      {isLoading && <LoadingOverlay />}
      {!isLoading && isError && <ErrorOverlay />}
      {!isLoading && !isError && !hasData && <EmptyOverlay />}
      {!isLoading && !isError && hasData && criteria.data && locations.data && (
        <LocationMap
          locations={locations.data}
          criteria={criteria.data}
          rankByLocationId={rankByLocationId}
        />
      )}
    </section>
  )
}

function LoadingOverlay() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-md bg-background/90 px-4 py-3 text-sm text-muted-foreground shadow"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Завантаження локацій...
      </div>
    </div>
  )
}

function ErrorOverlay() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-md border border-destructive/40 bg-background p-6 text-center text-sm">
        <p className="font-medium text-destructive">
          Не вдалося завантажити карту
        </p>
        <p className="mt-2 text-muted-foreground">
          Перевірте зʼєднання з API і повторіть спробу через хедер «Скинути сеанс».
        </p>
      </div>
    </div>
  )
}

function EmptyOverlay() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm rounded-md border bg-background p-6 text-center">
        <MapPin className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-base font-medium text-foreground">
          Локації не завантажено
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Додайте локації через API або скрипт сидингу, щоб запустити повний цикл
          обчислень.
        </p>
      </div>
    </div>
  )
}
