import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Minimize2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useUiStore } from '@/store/ui-store'

import { MapPane } from './MapPane'

// Fullscreen map overlay rendered through a portal so the fixed-inset wrapper
// escapes any clipped or transformed ancestors. Mounting is gated by
// useUiStore.mapFullscreen, so the parent renders this component only when the
// user has explicitly requested the fullscreen view.
export function FullscreenMapOverlay() {
  const setMapFullscreen = useUiStore((s) => s.setMapFullscreen)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMapFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    closeButtonRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [setMapFullscreen])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Карта локацій на весь екран"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">Карта локацій</span>
        <Button
          ref={closeButtonRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMapFullscreen(false)}
        >
          <Minimize2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Згорнути
        </Button>
      </div>
      <div className="flex-1">
        <MapPane />
      </div>
    </div>,
    document.body,
  )
}
