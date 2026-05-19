import { Link } from 'react-router-dom'
import { ProfileCard } from '@/features/profiles/ProfileCard'
import { useProfiles } from '@/features/profiles/useProfiles'
import { useProfileStore } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight } from 'lucide-react'

export function ProfilesPage() {
  const { data, isLoading, isError } = useProfiles()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Профілі ОПР</h1>
        <p className="mt-2 text-muted-foreground">
          Оберіть профіль особи, що приймає рішення. Він визначає семантику ваг критеріїв.
        </p>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          Не вдалося завантажити профілі. Перевірте, що backend піднято на :8000.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))
        ) : (
          data?.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={activeProfile?.id === profile.id}
              onSelect={() => setActiveProfile(profile)}
            />
          ))
        )}
      </div>

      {activeProfile && (
        <div className="flex justify-end">
          <Button asChild>
            <Link to="/calculate">
              Перейти до розрахунку
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
