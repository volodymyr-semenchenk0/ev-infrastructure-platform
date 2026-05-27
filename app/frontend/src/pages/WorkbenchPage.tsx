import { WorkbenchSidebar } from '@/features/workbench/WorkbenchSidebar'

// Workbench: persistent two-column layout per UI_PLAN §5 (sidebar + map).
// The accordion sections live in WorkbenchSidebar (their bodies are filled in
// tasks 4-10). The map pane is filled by MapPane in task 5; for now it stays
// a placeholder so reviewers can sanity-check the proportions and wiring.

function MapPlaceholder() {
  return (
    <section
      aria-label="Карта локацій-кандидатів"
      className="relative flex flex-1 items-center justify-center bg-muted"
    >
      <div className="max-w-md p-8 text-center text-sm text-muted-foreground">
        <p className="text-base font-medium text-foreground">Карта зʼявиться тут</p>
        <p className="mt-2">
          Персистентна карта MapLibre з маркерами локацій-кандидатів та шарами
          ранжування і стійкості (підключено на кроці 5 роадмапу).
        </p>
      </div>
    </section>
  )
}

export function WorkbenchPage() {
  return (
    <>
      <WorkbenchSidebar />
      <MapPlaceholder />
    </>
  )
}
