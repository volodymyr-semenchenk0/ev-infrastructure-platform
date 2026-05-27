import {
  SidebarAccordion,
  type AccordionSection,
} from './SidebarAccordion'
import { MatrixSection } from './sections/MatrixSection'
import { ProfileSection } from './sections/ProfileSection'
import { useSidebarStatuses } from './useSidebarStatuses'

// Sections 3-5 are placeholders until tasks 8-10 fill them with real forms
// and charts; ProfileSection (task 4) and MatrixSection (task 7) are wired.
function Placeholder({ note }: { note: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {note}
    </p>
  )
}

const SIDEBAR_WIDTH_CLASS = 'w-[420px]'

export function WorkbenchSidebar() {
  const statuses = useSidebarStatuses()

  const sections: AccordionSection[] = [
    {
      id: 'profile',
      title: '1. Профіль ОПР',
      status: statuses.profile,
      content: <ProfileSection />,
    },
    {
      id: 'matrix',
      title: '2. Матриця попарних порівнянь',
      status: statuses.matrix,
      content: <MatrixSection />,
    },
    {
      id: 'weights',
      title: '3. Ваги критеріїв (FAHP)',
      status: statuses.weights,
      content: <Placeholder note="Діаграма ваг w_j зʼявиться після виклику FAHP на кроці 8." />,
    },
    {
      id: 'ranking',
      title: '4. Ранжування локацій (TOPSIS)',
      status: statuses.ranking,
      content: <Placeholder note="Таблиця рангів і колір маркерів на карті зʼявляться на кроці 9." />,
    },
    {
      id: 'sensitivity',
      title: '5. Аналіз чутливості (Монте-Карло)',
      status: statuses.sensitivity,
      content: <Placeholder note="Параметри N і δ, прогрес, мініатюри діаграм зʼявляться на кроці 10." />,
    },
  ]

  return (
    <aside
      aria-label="Панель керування СППР"
      className={`${SIDEBAR_WIDTH_CLASS} shrink-0 overflow-y-auto border-r bg-card`}
    >
      <SidebarAccordion sections={sections} defaultOpenIds={['profile']} />
    </aside>
  )
}
