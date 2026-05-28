import { Accordion, type AccordionSection } from '@/features/workbench/Accordion'
import { FullscreenMapOverlay } from '@/features/workbench/FullscreenMapOverlay'
import { useAccordionStatuses } from '@/features/workbench/useAccordionStatuses'
import { MatrixSection } from '@/features/workbench/sections/MatrixSection'
import { ProfileSection } from '@/features/workbench/sections/ProfileSection'
import { RankingSection } from '@/features/workbench/sections/RankingSection'
import { SensitivitySection } from '@/features/workbench/sections/SensitivitySection'
import { WeightsSection } from '@/features/workbench/sections/WeightsSection'
import { useProfileStore } from '@/store/profile-store'
import { useUiStore } from '@/store/ui-store'

// Single consolidated workbench page. Every step of the operator's workflow
// lives in one scrollable column of accordions; the map is hidden until the
// operator explicitly asks for it inside the ranking section.

export function HomePage() {
  const statuses = useAccordionStatuses()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const openAccordionIds = useUiStore((s) => s.openAccordionIds)
  const setOpenAccordionIds = useUiStore((s) => s.setOpenAccordionIds)
  const mapFullscreen = useUiStore((s) => s.mapFullscreen)

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
      title: '3. Розрахунок вагів (FAHP)',
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
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">СППР вибору локацій ЗС</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Послідовно пройдіть від профілю ОПР до аналізу чутливості. Карта
            з'являється над таблицею ранжування за командою.
          </p>
        </div>

        <Accordion
          sections={sections}
          openIds={openAccordionIds}
          onOpenIdsChange={setOpenAccordionIds}
        />
      </div>
      {mapFullscreen && <FullscreenMapOverlay />}
    </div>
  )
}
