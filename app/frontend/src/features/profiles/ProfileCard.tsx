import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/store/profile-store'

interface ProfileCardProps {
  profile: Profile
  isActive: boolean
  onSelect: () => void
}

export function ProfileCard({ profile, isActive, onSelect }: ProfileCardProps) {
  return (
    <Card
      className={cn(
        'transition-shadow',
        isActive && 'border-primary ring-2 ring-primary/40',
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{profile.name}</CardTitle>
          {isActive && <Check className="h-5 w-5 text-primary" />}
        </div>
        <CardDescription className="font-mono text-xs">{profile.code}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          {profile.description ?? '—'}
        </p>
        <Button
          variant={isActive ? 'secondary' : 'default'}
          onClick={onSelect}
          size="sm"
          className="w-full"
        >
          {isActive ? 'Активний' : 'Обрати'}
        </Button>
      </CardContent>
    </Card>
  )
}
