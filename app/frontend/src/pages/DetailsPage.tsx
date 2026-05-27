import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Fullscreen `/details` view per UI_PLAN §5.4. Sections 5.4.1–5.4.4 land here:
// matrix editor (task 6), FAHP details (task 11), TOPSIS details (task 11),
// Monte Carlo details (task 11). Each section is anchored so the sidebar
// buttons can deep-link via the hash.

const SECTIONS = [
  { id: 'matrix', title: 'Редактор матриці Ã', hint: 'Крок 6 роадмапу.' },
  { id: 'fahp', title: 'Деталі FAHP', hint: 'Крок 11 роадмапу.' },
  { id: 'topsis', title: 'Деталі TOPSIS', hint: 'Крок 11 роадмапу.' },
  { id: 'mc', title: 'Деталі Монте-Карло', hint: 'Крок 11 роадмапу.' },
] as const

export function DetailsPage() {
  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Деталі обчислень</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Розгорнуті проміжні величини FAHP, TOPSIS і Монте-Карло, а також
              повноекранний редактор матриці попарних порівнянь.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              До панелі
            </Link>
          </Button>
        </div>
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="rounded-lg border bg-card p-6"
          >
            <h2 id={`${section.id}-title`} className="text-xl font-semibold">
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{section.hint}</p>
          </section>
        ))}
      </div>
    </main>
  )
}
