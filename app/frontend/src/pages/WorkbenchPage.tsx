// Workbench: persistent two-column layout per UI_PLAN §5 (sidebar + map).
// Sections 5.2.1–5.2.5 land in `WorkbenchSidebar` across tasks 3–10.
// The map pane is filled by `MapPane` in task 5; for now both are placeholders
// so reviewers can sanity-check the proportions and the wiring.

const SIDEBAR_WIDTH_CLASS = 'w-[420px]'

function SidebarPlaceholder() {
  return (
    <aside
      aria-label="Панель керування СППР"
      className={`${SIDEBAR_WIDTH_CLASS} shrink-0 overflow-y-auto border-r bg-card`}
    >
      <div className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Панель керування</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            П'ять секцій-акордеонів зʼявляться тут на наступних кроках: профіль ОПР,
            матриця попарних порівнянь, ваги критеріїв, ранжування локацій, аналіз
            чутливості.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>1. Профіль ОПР</li>
          <li>2. Матриця попарних порівнянь</li>
          <li>3. Ваги критеріїв (FAHP)</li>
          <li>4. Ранжування локацій (TOPSIS)</li>
          <li>5. Аналіз чутливості (Монте-Карло)</li>
        </ul>
      </div>
    </aside>
  )
}

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
      <SidebarPlaceholder />
      <MapPlaceholder />
    </>
  )
}
