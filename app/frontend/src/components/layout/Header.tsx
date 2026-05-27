import { Zap, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useProfileStore } from '@/store/profile-store'

interface HeaderProps {
  onResetSession?: () => void
}

export function Header({ onResetSession }: HeaderProps = {}) {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)

  const handleReset = () => {
    setActiveProfile(null)
    onResetSession?.()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-base font-semibold">СППР EV</h1>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {activeProfile ? (
            <>
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full bg-primary"
              />
              <span>
                Профіль:{' '}
                <span className="font-medium text-foreground">{activeProfile.name}</span>
              </span>
            </>
          ) : (
            'Профіль не обрано'
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!activeProfile}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Скинути сеанс
        </Button>
      </div>
    </header>
  )
}
