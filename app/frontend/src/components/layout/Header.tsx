import { useProfileStore } from '@/store/profile-store'
import { Zap } from 'lucide-react'

export function Header() {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h1 className="text-base font-semibold">СППР EV Київ</h1>
      </div>
      <div className="text-sm text-muted-foreground">
        {activeProfile ? (
          <>
            Активний профіль:{' '}
            <span className="font-medium text-foreground">{activeProfile.name}</span>
          </>
        ) : (
          'Профіль не обрано'
        )}
      </div>
    </header>
  )
}
