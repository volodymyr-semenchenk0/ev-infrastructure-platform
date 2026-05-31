import { useEffect, useMemo, useRef, type ReactNode } from 'react'

import { FullscreenMapOverlay } from '@/features/workbench/FullscreenMapOverlay'
import { Stepper, type StepItem } from '@/features/workbench/Stepper'
import { MatrixSection } from '@/features/workbench/sections/MatrixSection'
import { ProfileSection } from '@/features/workbench/sections/ProfileSection'
import { RankingSection } from '@/features/workbench/sections/RankingSection'
import { SensitivitySection } from '@/features/workbench/sections/SensitivitySection'
import { WeightsSection } from '@/features/workbench/sections/WeightsSection'
import { useSessionStore } from '@/store/session-store'
import { useUiStore, type StepId } from '@/store/ui-store'

// Single workbench page driven by a 4-step wizard. Steps 1-3 (profile+matrix →
// FAHP weights → TOPSIS ranking) are the mandatory connected flow; the
// sensitivity step is detached and optional. All step panels stay mounted and
// inactive ones are hidden, so switching steps never discards their state
// (e.g. uncommitted matrix edits, sensitivity form inputs).

export function HomePage() {
  const activeStep = useUiStore((s) => s.activeStep)
  const setActiveStep = useUiStore((s) => s.setActiveStep)
  const mapFullscreen = useUiStore((s) => s.mapFullscreen)

  const weights = useSessionStore((s) => s.weights)
  const ranking = useSessionStore((s) => s.ranking)

  // FAHP sets weights + evaluationId and holds the ranking; running ranking on
  // the weights step then fills `ranking`. So the weights step unlocks after
  // FAHP, while ranking and the (analytical) sensitivity step unlock only once
  // the ranking has been run.
  const enabled: Record<StepId, boolean> = useMemo(
    () => ({
      setup: true,
      weights: weights !== null,
      ranking: ranking !== null,
      sensitivity: ranking !== null,
    }),
    [weights, ranking],
  )

  const steps: StepItem[] = [
    {
      id: 'setup',
      label: 'Профіль і матриця',
      complete: weights !== null,
      disabled: false,
    },
    {
      id: 'weights',
      label: 'Ваги (FAHP)',
      complete: weights !== null,
      disabled: !enabled.weights,
    },
    {
      id: 'ranking',
      label: 'Ранжування (TOPSIS)',
      complete: ranking !== null,
      disabled: !enabled.ranking,
    },
    {
      id: 'sensitivity',
      label: 'Чутливість (МК)',
      // Analytical step: never reaches a completed state, only unlocks.
      complete: false,
      disabled: !enabled.sensitivity,
      optional: true,
    },
  ]

  // Auto-advance through the mandatory flow, guarding on the null→value
  // transition only so manual navigation back is respected and a restored
  // session does not force a jump on mount. FAHP → show the weights step (and
  // its "run ranking" button); running ranking → show the ranking results.
  const prevWeights = useRef(weights)
  useEffect(() => {
    if (weights && !prevWeights.current) {
      setActiveStep('weights')
    }
    prevWeights.current = weights
  }, [weights, setActiveStep])

  const prevRanking = useRef(ranking)
  useEffect(() => {
    if (ranking && !prevRanking.current) {
      setActiveStep('ranking')
    }
    prevRanking.current = ranking
  }, [ranking, setActiveStep])

  // Switching the profile resets the session, which can leave the active step
  // pointing at a now-disabled step. Fall back to the always-available setup.
  useEffect(() => {
    if (activeStep !== 'setup' && !enabled[activeStep]) {
      setActiveStep('setup')
    }
  }, [activeStep, enabled, setActiveStep])

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1200px] space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">СППР вибору локацій ЗС</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Пройдіть три обовʼязкові кроки – профіль і матриця, ваги FAHP,
            ранжування. Аналіз чутливості Монте-Карло – окремий необовʼязковий
            крок. Перемикайтесь між кроками у степері без втрати стану.
          </p>
        </div>

        <Stepper steps={steps} activeId={activeStep} onSelect={setActiveStep} />

        <StepPanel id="setup" activeStep={activeStep} label="Профіль і матриця">
          <div className="space-y-6">
            <ProfileSection />
            <MatrixSection />
          </div>
        </StepPanel>
        <StepPanel id="weights" activeStep={activeStep} label="Розрахунок вагів (FAHP)">
          <WeightsSection />
        </StepPanel>
        <StepPanel id="ranking" activeStep={activeStep} label="Ранжування локацій (TOPSIS)">
          <RankingSection />
        </StepPanel>
        <StepPanel
          id="sensitivity"
          activeStep={activeStep}
          label="Аналіз чутливості (Монте-Карло)"
        >
          <SensitivitySection />
        </StepPanel>
      </div>
      {mapFullscreen && <FullscreenMapOverlay />}
    </div>
  )
}

interface StepPanelProps {
  id: StepId
  activeStep: StepId
  label: string
  children: ReactNode
}

// Panels stay mounted to preserve per-step state; inactive ones are hidden via
// the `hidden` attribute (display:none), which also drops them from the tab
// order. nivo charts and MapLibre re-measure via ResizeObserver when shown.
function StepPanel({ id, activeStep, label, children }: StepPanelProps) {
  const isActive = id === activeStep
  return (
    <div
      role="region"
      aria-label={label}
      hidden={!isActive}
      className="rounded-lg border bg-card p-4"
    >
      {children}
    </div>
  )
}
