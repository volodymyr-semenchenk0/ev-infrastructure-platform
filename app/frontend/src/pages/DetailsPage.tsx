import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FahpDetails } from '@/features/details/FahpDetails'
import { MatrixEditor } from '@/features/details/MatrixEditor'
import { McDetails } from '@/features/details/McDetails'
import { TopsisDetails } from '@/features/details/TopsisDetails'

// Fullscreen `/details` view per UI_PLAN §5.4. Each section is an anchored
// region so the sidebar deep links (#matrix, #fahp, #topsis, #mc) jump
// straight to the relevant block.

const SECTIONS = [
  { id: 'matrix', title: 'Редактор матриці попарних порівнянь' },
  { id: 'fahp', title: 'Деталі FAHP' },
  { id: 'topsis', title: 'Деталі TOPSIS' },
  { id: 'mc', title: 'Деталі Монте-Карло' },
] as const

export function DetailsPage() {
  const { hash } = useLocation()

  // Scroll to the anchored section when the hash changes (deep links from
  // the sidebar use `<Link to="/details#mc">`). Without this the page would
  // mount at the top regardless of the hash.
  useEffect(() => {
    if (!hash) return
    const id = hash.replace(/^#/, '')
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash])

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Деталі обчислень</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Повноекранний редактор матриці попарних порівнянь, проміжні
              величини FAHP/TOPSIS і повна матриця Монте-Карло.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              До панелі
            </Link>
          </Button>
        </div>

        <nav aria-label="Розділи деталей" className="flex flex-wrap gap-2 text-sm">
          {SECTIONS.map((section) => (
            <Button key={section.id} asChild variant="ghost" size="sm">
              <a href={`#${section.id}`}>{section.title}</a>
            </Button>
          ))}
        </nav>

        <section
          id="matrix"
          aria-labelledby="matrix-title"
          className="rounded-lg border bg-card p-6 scroll-mt-4"
        >
          <h2 id="matrix-title" className="sr-only">
            Редактор матриці попарних порівнянь
          </h2>
          <MatrixEditor />
        </section>

        <section
          id="fahp"
          aria-labelledby="fahp-title"
          className="rounded-lg border bg-card p-6 scroll-mt-4"
        >
          <h2 id="fahp-title" className="text-xl font-semibold">
            Деталі FAHP
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Ваги критеріїв w_j у спадному порядку та підсумкове CR останнього
            розрахунку.
          </p>
          <FahpDetails />
        </section>

        <section
          id="topsis"
          aria-labelledby="topsis-title"
          className="rounded-lg border bg-card p-6 scroll-mt-4"
        >
          <h2 id="topsis-title" className="text-xl font-semibold">
            Деталі TOPSIS
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Повне ранжування з C_i*, S_i^+, S_i^-. Натисніть рядок, щоб
            підсвітити локацію на карті при поверненні до панелі.
          </p>
          <TopsisDetails />
        </section>

        <section
          id="mc"
          aria-labelledby="mc-title"
          className="rounded-lg border bg-card p-6 scroll-mt-4"
        >
          <h2 id="mc-title" className="text-xl font-semibold">
            Деталі Монте-Карло
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Параметри запуску, повна матриця стабільності p_i(k) і 95 % ДІ
            для топ-3 локацій.
          </p>
          <McDetails />
        </section>
      </div>
    </main>
  )
}
