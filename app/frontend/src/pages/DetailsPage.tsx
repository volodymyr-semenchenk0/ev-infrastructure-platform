import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MatrixEditor } from '@/features/details/MatrixEditor'

// Fullscreen `/details` view per UI_PLAN §5.4. Anchors:
//   #matrix - matrix editor (task 6, this commit)
//   #fahp   - FAHP intermediates (task 11)
//   #topsis - TOPSIS intermediates (task 11)
//   #mc     - Monte Carlo histograms (task 11)

const PENDING_SECTIONS = [
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
              Повноекранний редактор матриці попарних порівнянь, а далі –
              проміжні величини FAHP, TOPSIS і Монте-Карло.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              До панелі
            </Link>
          </Button>
        </div>

        <section
          id="matrix"
          aria-labelledby="matrix-title"
          className="rounded-lg border bg-card p-6"
        >
          <h2 id="matrix-title" className="sr-only">
            Редактор матриці попарних порівнянь
          </h2>
          <MatrixEditor />
        </section>

        {PENDING_SECTIONS.map((section) => (
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
