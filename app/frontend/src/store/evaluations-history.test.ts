import { describe, it, expect, beforeEach } from 'vitest'
import { useEvaluationsHistory } from './evaluations-history'

function reset() {
  useEvaluationsHistory.setState({ recent: [] })
}

const fixture = (id: number, profileName = 'Муніципальний') => ({
  id,
  profileName,
  profileCode: 'municipal',
  createdAt: new Date(2026, 4, 19, 12, id).toISOString(),
})

describe('useEvaluationsHistory', () => {
  beforeEach(reset)

  it('starts with empty recent list', () => {
    expect(useEvaluationsHistory.getState().recent).toEqual([])
  })

  it('pushEvaluation prepends new item', () => {
    const store = useEvaluationsHistory.getState()
    store.pushEvaluation(fixture(1))
    store.pushEvaluation(fixture(2))
    const recent = useEvaluationsHistory.getState().recent
    expect(recent.map((r) => r.id)).toEqual([2, 1])
  })

  it('deduplicates by id — repeated push moves item to top', () => {
    const store = useEvaluationsHistory.getState()
    store.pushEvaluation(fixture(1))
    store.pushEvaluation(fixture(2))
    store.pushEvaluation(fixture(1, 'updated name'))
    const recent = useEvaluationsHistory.getState().recent
    expect(recent.map((r) => r.id)).toEqual([1, 2])
    expect(recent[0].profileName).toBe('updated name')
  })

  it('limits recent list to 5 entries', () => {
    const store = useEvaluationsHistory.getState()
    for (let i = 1; i <= 7; i++) store.pushEvaluation(fixture(i))
    const recent = useEvaluationsHistory.getState().recent
    expect(recent).toHaveLength(5)
    expect(recent.map((r) => r.id)).toEqual([7, 6, 5, 4, 3])
  })
})
