import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, History } from 'lucide-react'
import { useEvaluationsHistory } from '@/store/evaluations-history'

export function EvaluationsHistoryList() {
  const recent = useEvaluationsHistory((s) => s.recent)

  if (recent.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Історія розрахунків порожня</CardTitle>
            <CardDescription>
              Виконайте перший розрахунок, щоб побачити результати тут.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/profile">
                Новий розрахунок
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Останні розрахунки</h1>
        <p className="mt-2 text-muted-foreground">
          Збережено локально, до 5 останніх обчислень.
        </p>
      </div>
      <div className="grid gap-3">
        {recent.map((item) => (
          <Link key={item.id} to={`/results/${item.id}`} className="block">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">
                    Розрахунок #{item.id}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {item.profileName} ·{' '}
                    {new Date(item.createdAt).toLocaleString('uk-UA')}
                  </CardDescription>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
