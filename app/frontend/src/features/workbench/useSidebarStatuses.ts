import { useProfileStore } from '@/store/profile-store'
import { useSessionStore } from '@/store/session-store'

import type { SectionStatus } from './StatusBadge'

// Consistency threshold from UI_PLAN §5.2.2 and Chapter 1 (1.2): the
// pairwise matrix is admissible iff CR <= 0.10. Above that, the matrix
// section flips to attention so the operator can fix it before FAHP.
const CR_THRESHOLD = 0.1

export interface SidebarStatuses {
  profile: SectionStatus
  matrix: SectionStatus
  weights: SectionStatus
  ranking: SectionStatus
  sensitivity: SectionStatus
}

export function useSidebarStatuses(): SidebarStatuses {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const pairwiseMatrix = useSessionStore((s) => s.pairwiseMatrix)
  const consistencyRatio = useSessionStore((s) => s.consistencyRatio)
  const weights = useSessionStore((s) => s.weights)
  const ranking = useSessionStore((s) => s.ranking)
  const sensitivity = useSessionStore((s) => s.sensitivity)

  const matrixStatus: SectionStatus =
    pairwiseMatrix === null
      ? 'idle'
      : consistencyRatio !== null && consistencyRatio > CR_THRESHOLD
        ? 'attention'
        : 'ready'

  return {
    profile: activeProfile ? 'ready' : 'idle',
    matrix: matrixStatus,
    weights: weights ? 'ready' : 'idle',
    ranking: ranking ? 'ready' : 'idle',
    sensitivity: sensitivity ? 'ready' : 'idle',
  }
}
