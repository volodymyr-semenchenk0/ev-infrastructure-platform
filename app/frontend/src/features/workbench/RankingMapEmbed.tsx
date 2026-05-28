import { Maximize2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useUiStore } from '@/store/ui-store'

import { MapPane } from './MapPane'

// Embedded map slot rendered inside the ranking accordion above the table.
// Sizing is owned here (fixed ~480px) so the accordion content stays scannable.
// Going fullscreen unmounts the MapPane to keep MapLibre as a single instance —
// re-collapsing remounts it; the brief reflow is preferable to two parallel
// WebGL contexts sharing the same store.
export function RankingMapEmbed() {
  const mapFullscreen = useUiStore((s) => s.mapFullscreen)
  const setMapFullscreen = useUiStore((s) => s.setMapFullscreen)

  return (
    <div className="relative h-[480px] overflow-hidden rounded-md border bg-muted">
      {mapFullscreen ? (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Карту розгорнуто на весь екран. Згорніть її, щоб переглянути тут.
        </div>
      ) : (
        <MapPane />
      )}
      {!mapFullscreen && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-3 top-3 z-10 shadow"
          onClick={() => setMapFullscreen(true)}
          aria-label="Розгорнути карту на весь екран"
        >
          <Maximize2 className="mr-2 h-4 w-4" aria-hidden="true" />
          На весь екран
        </Button>
      )}
    </div>
  )
}
