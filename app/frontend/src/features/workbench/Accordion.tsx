import { useEffect, useId, useRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

import { StatusBadge, type SectionStatus } from './StatusBadge'

export interface AccordionSection {
  id: string
  title: string
  // Shown next to the title when the section is collapsed. Pass undefined to
  // render nothing (avoids an empty gap in the trigger row).
  label?: string
  status: SectionStatus
  content: ReactNode
}

interface AccordionProps {
  sections: AccordionSection[]
  openIds: string[]
  onOpenIdsChange: (ids: string[]) => void
  // Hard cap on simultaneously open sections. When the user opens a section
  // beyond the cap, the oldest open one collapses first (FIFO).
  maxOpen?: number
}

const DEFAULT_MAX_OPEN = 3

// FIFO append with cap eviction. Order is meaningful: the oldest entry sits at
// the front of the array, so a cap-trim slices off the tail-most window.
function appendCapped(current: string[], id: string, maxOpen: number): string[] {
  if (current.includes(id)) return current
  const next = [...current, id]
  return next.length > maxOpen ? next.slice(next.length - maxOpen) : next
}

export function Accordion({
  sections,
  openIds,
  onOpenIdsChange,
  maxOpen = DEFAULT_MAX_OPEN,
}: AccordionProps) {
  const idPrefix = useId()

  const toggle = (sectionId: string) => {
    if (openIds.includes(sectionId)) {
      onOpenIdsChange(openIds.filter((id) => id !== sectionId))
      return
    }
    onOpenIdsChange(appendCapped(openIds, sectionId, maxOpen))
  }

  // Wizard auto-advance: open the relevant section whenever one or more steps
  // complete in the same render. We watch status transitions only — sections
  // that mount already 'ready' (restored session) do not trigger this, which
  // keeps user-controlled state intact. Manual closes are respected: the next
  // auto-open fires only on the next transition.
  //
  // Single transition (e.g. matrix → ready): guide the operator to the next
  // step by opening the section immediately below.
  //
  // Multiple simultaneous transitions (e.g. POST /api/evaluations returns FAHP
  // weights AND TOPSIS ranking in one round-trip): open the LAST section that
  // just became ready so the operator sees the most recent computation result.
  // Opening the section right after it would skip over the ranking results the
  // operator needs to review before deciding to run sensitivity analysis.
  const prevStatusesRef = useRef<Record<string, SectionStatus>>({})
  // Keep openIds available inside the effect without retriggering on every
  // change — the effect must fire on `sections` changes only (status diff).
  const openIdsRef = useRef(openIds)
  openIdsRef.current = openIds
  useEffect(() => {
    const prev = prevStatusesRef.current

    const transitionedIndices: number[] = []
    sections.forEach((s, i) => {
      if (s.status === 'ready' && prev[s.id] !== undefined && prev[s.id] !== 'ready') {
        transitionedIndices.push(i)
      }
    })

    let targetId: string | undefined
    if (transitionedIndices.length === 1) {
      const next = sections[transitionedIndices[0] + 1]
      if (next && next.status !== 'ready') {
        targetId = next.id
      }
    } else if (transitionedIndices.length > 1) {
      const lastIdx = transitionedIndices[transitionedIndices.length - 1]
      targetId = sections[lastIdx].id
    }

    if (targetId !== undefined) {
      const id = targetId
      const next = appendCapped(openIdsRef.current, id, maxOpen)
      if (next !== openIdsRef.current) {
        onOpenIdsChange(next)
      }
    }

    prevStatusesRef.current = Object.fromEntries(sections.map((s) => [s.id, s.status]))
  }, [sections, maxOpen, onOpenIdsChange])

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => {
        const isOpen = openIds.includes(section.id)
        const panelId = `${idPrefix}-${section.id}-panel`
        const triggerId = `${idPrefix}-${section.id}-trigger`
        return (
          <div
            key={section.id}
            id={section.id}
            className="overflow-hidden rounded-lg border bg-card scroll-mt-4"
          >
            <h3 className="m-0">
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(section.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-medium',
                  'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                  <span>{section.title}</span>
                  {!isOpen && section.label && (
                    <span className="truncate rounded border border-border bg-background px-1.5 py-0.5 text-xs font-normal text-foreground">
                      {section.label}
                    </span>
                  )}
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
