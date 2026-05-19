import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function HomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          СППР — EV-зарядні станції Києва
        </h1>
        <p className="mt-2 text-muted-foreground">
          Система підтримки прийняття рішень для вибору локацій електрозарядних
          станцій з використанням FAHP, TOPSIS та Monte Carlo.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Початок роботи</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Оберіть профіль ОПР у меню «Профілі», потім відредагуйте матрицю
          попарних порівнянь у «Розрахунок».
        </CardContent>
      </Card>
    </div>
  )
}
