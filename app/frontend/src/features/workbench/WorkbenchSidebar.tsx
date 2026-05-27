import {
  SidebarAccordion,
  type AccordionSection,
} from './SidebarAccordion'
import { MatrixSection } from './sections/MatrixSection'
import { ProfileSection } from './sections/ProfileSection'
import { RankingSection } from './sections/RankingSection'
import { SensitivitySection } from './sections/SensitivitySection'
import { WeightsSection } from './sections/WeightsSection'
import { useSidebarStatuses } from './useSidebarStatuses'
import { useProfileStore } from '@/store/profile-store'
import { useUiStore } from '@/store/ui-store'

const SIDEBAR_WIDTH_CLASS = 'w-[420px]'

export function WorkbenchSidebar() {
  const statuses = useSidebarStatuses()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const sidebarOpenIds = useUiStore((s) => s.sidebarOpenIds)
  const setSidebarOpenIds = useUiStore((s) => s.setSidebarOpenIds)

  const sections: AccordionSection[] = [
    {
      id: 'profile',
      title: '1. Профіль ОПР',
      label: activeProfile?.name,
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
      content: <SensitivitySection />,
    },
  ]

  return (
    <aside
      aria-label="Панель керування СППР"
      className={`${SIDEBAR_WIDTH_CLASS} shrink-0 overflow-y-auto border-r bg-card`}
    >
      <SidebarAccordion
        sections={sections}
        defaultOpenIds={sidebarOpenIds}
        onOpenIdsChange={setSidebarOpenIds}
      />
    </aside>
  )
}
