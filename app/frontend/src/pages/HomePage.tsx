import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfiles } from '@/features/profiles/useProfiles'
import { useCriteria } from '@/features/calculate/useCriteria'
import { useLocations } from '@/features/locations/useLocations'
import { Users, ListChecks, MapPin, ArrowRight } from 'lucide-react'

function StatCard({
  title,
  value,
  description,
  icon,
  isLoading,
}: {
  title: string
  value: number | undefined
  description: string
  icon: React.ReactNode
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value ?? '—'}</div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const profiles = useProfiles()
  const criteria = useCriteria()
  const locations = useLocations()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          СППР — EV-зарядні станції Києва
        </h1>
        <p className="mt-2 text-muted-foreground">
          Система підтримки прийняття рішень для вибору локацій електрозарядних
          станцій з використанням FAHP, TOPSIS та Monte Carlo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Профілі ОПР"
          value={profiles.data?.length}
          description="Муніципальний та інвестор"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          isLoading={profiles.isLoading}
        />
        <StatCard
          title="Критерії"
          value={criteria.data?.length}
          description="Демографія, інфраструктура, економіка"
          icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}
          isLoading={criteria.isLoading}
        />
        <StatCard
          title="Локації-кандидати"
          value={locations.data?.length}
          description="Райони Києва"
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
          isLoading={locations.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Як почати</CardTitle>
          <CardDescription>
            Оберіть профіль, відредагуйте матрицю попарних порівнянь, отримайте ранжування.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/profile">
              Почати розрахунок
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
