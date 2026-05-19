import { describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'

import { api, NotFoundError } from '@/lib/api'

import type { ComparisonResponse } from './useComparison'

describe('comparison API contract', () => {
  it('GET /evaluations/{a}/comparison/{b} returns spearmanRho and pairwiseDifferences', async () => {
    const mock = new MockAdapter(api)
    const payload: ComparisonResponse = {
      spearmanRho: 0.87,
      pairwiseDifferences: [
        { locationId: 1, rankA: 1, rankB: 2, delta: -1 },
        { locationId: 2, rankA: 2, rankB: 1, delta: 1 },
      ],
    }
    mock.onGet('/evaluations/1/comparison/2').reply(200, payload)

    const { data } = await api.get<ComparisonResponse>('/evaluations/1/comparison/2')

    expect(data.spearmanRho).toBeCloseTo(0.87, 6)
    expect(data.pairwiseDifferences).toHaveLength(2)
    expect(data.pairwiseDifferences[0]).toMatchObject({
      locationId: 1,
      rankA: 1,
      rankB: 2,
      delta: -1,
    })
    mock.restore()
  })

  it('maps 404 to NotFoundError when one evaluation does not exist', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/evaluations/9999/comparison/1').reply(404, { detail: 'Not found' })

    await expect(api.get('/evaluations/9999/comparison/1')).rejects.toBeInstanceOf(
      NotFoundError,
    )
    mock.restore()
  })
})
