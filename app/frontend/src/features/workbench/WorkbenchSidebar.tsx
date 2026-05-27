import {
  SidebarAccordion,
  type AccordionSection,
} from './SidebarAccordion'
import { MatrixSection } from './sections/MatrixSection'
import { ProfileSection } from './sections/ProfileSection'
import { RankingSection } from './sections/RankingSection'
import { WeightsSection } from './sections/WeightsSection'
import { useSidebarStatuses } from './useSidebarStatuses'

// Section 5 (sensitivity) is the last placeholder; tasks 1-4 sections, plus
// MatrixSection (7), WeightsSection (8), and RankingSection (9), are wired.
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
      content: <WeightsSection />,
    },
    {
      id: 'ranking',
      title: '4. Ранжування локацій (TOPSIS)',
      status: statuses.ranking,
      content: <RankingSection />,
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
