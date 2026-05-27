import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileCard } from '@/features/profiles/ProfileCard'
import { useProfiles } from '@/features/profiles/useProfiles'
import { useProfileStore, type Profile } from '@/store/profile-store'
import { useSessionStore } from '@/store/session-store'

import { useLoadProfileDefault } from './useLoadProfileDefault'

// Sidebar §5.2.1: profile picker collapses to a one-line status once a
// profile is chosen; clicking «Змінити» expands the picker again. Switching
// the profile wipes the rest of the session because weights and rankings
// were computed from the previous profile's pairwise matrix.
export function ProfileSection() {
  const profiles = useProfiles()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const resetSession = useSessionStore((s) => s.resetSession)
  const loadProfileDefault = useLoadProfileDefault()
  const [expanded, setExpanded] = useState(false)

  const handleSelect = (profile: Profile) => {
    const isSwitching = activeProfile?.id !== profile.id
    if (isSwitching) {
      // Changing the profile invalidates anything we cached for the old one.
      resetSession()
    }
    setActiveProfile(profile)
    setExpanded(false)
    if (isSwitching) {
      // Auto-load the default Ã matrix in the background; the matrix accordion
      // picks it up via the session store. Success is silent because the
      // operator just picked the profile and does not need a confirmation
      // toast on top. The hook still toasts on 404/error fallbacks.
      void loadProfileDefault(profile.id, { silentSuccess: true })
    }
  }

  if (profiles.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (profiles.isError || !profiles.data) {
    return (
      <p className="text-sm text-destructive">
        Не вдалося завантажити список профілів.
      </p>
    )
  }

  if (activeProfile && !expanded) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            Профіль: {activeProfile.name}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
          Змінити
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Оберіть профіль ОПР, щоб задати початкові ваги критеріїв.
      </p>
      {profiles.data.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          isActive={activeProfile?.id === profile.id}
          onSelect={() => handleSelect(profile)}
        />
      ))}
      {activeProfile && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
          Скасувати
        </Button>
      )}
    </div>
  )
}
