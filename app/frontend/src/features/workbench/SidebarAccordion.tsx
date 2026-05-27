import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

import { StatusBadge, type SectionStatus } from './StatusBadge'

export interface AccordionSection {
  id: string
  title: string
  status: SectionStatus
  content: ReactNode
}

interface SidebarAccordionProps {
  sections: AccordionSection[]
  defaultOpenIds?: string[]
  // Hard cap on simultaneously open sections (UI_PLAN §5.2: "single or double
  // open at once"). When the user opens a section beyond the cap, the oldest
  // open one collapses first (FIFO).
  maxOpen?: number
}

const DEFAULT_MAX_OPEN = 2

export function SidebarAccordion({
  sections,
  defaultOpenIds = [],
  maxOpen = DEFAULT_MAX_OPEN,
}: SidebarAccordionProps) {
  const idPrefix = useId()
  // openOrder preserves insertion order so the oldest-open section gets
  // evicted when the cap is reached.
  const [openOrder, setOpenOrder] = useState<string[]>(() => defaultOpenIds.slice(0, maxOpen))

  const toggle = useCallback(
    (sectionId: string) => {
      setOpenOrder((current) => {
        if (current.includes(sectionId)) {
          return current.filter((id) => id !== sectionId)
        }
        const next = [...current, sectionId]
        return next.length > maxOpen ? next.slice(next.length - maxOpen) : next
      })
    },
    [maxOpen],
  )

  // Wizard auto-advance: when any section transitions into 'ready' (from
  // 'idle' or 'attention'), open the first not-yet-ready section below the
  // transition so the operator does not have to click through every step.
  // We skip over sections that are already 'ready' because a single user
  // action can flip several steps at once (e.g. POST /api/evaluations
  // returns FAHP weights and TOPSIS ranking in one round-trip, so both
  // 'weights' and 'ranking' become ready in the same render and the next
  // unfinished step is 'sensitivity'). We watch transitions only —
  // sections that mount already 'ready' (restored session) do not trigger
  // this, which keeps user-controlled state intact across rerenders.
  // Manual closes are also respected: the next auto-open fires only on
  // the next status transition.
  const prevStatusesRef = useRef<Record<string, SectionStatus>>({})
  useEffect(() => {
    const prev = prevStatusesRef.current
    const transitionedToReady = sections.some(
      (s) => s.status === 'ready' && prev[s.id] !== undefined && prev[s.id] !== 'ready',
    )
    if (transitionedToReady) {
      const target = sections.find((s) => s.status !== 'ready')
      if (target) {
        setOpenOrder((current) => {
          if (current.includes(target.id)) return current
          const appended = [...current, target.id]
          return appended.length > maxOpen
            ? appended.slice(appended.length - maxOpen)
            : appended
        })
      }
    }
    prevStatusesRef.current = Object.fromEntries(sections.map((s) => [s.id, s.status]))
  }, [sections, maxOpen])

  return (
    <div className="divide-y border-b">
      {sections.map((section) => {
        const isOpen = openOrder.includes(section.id)
        const panelId = `${idPrefix}-${section.id}-panel`
        const triggerId = `${idPrefix}-${section.id}-trigger`
        return (
          <div key={section.id} className="bg-card">
            <h3 className="m-0">
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(section.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium',
                  'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <span className="flex items-center gap-2">
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                  <span>{section.title}</span>
                </span>
                <StatusBadge status={section.status} />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="px-4 pb-4 pt-1 text-sm"
            >
              {isOpen ? section.content : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
