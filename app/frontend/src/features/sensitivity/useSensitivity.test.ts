import { describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'

import { api, NotFoundError } from '@/lib/api'

import type { SensitivityResponse } from './useSensitivity'

describe('useSensitivity payload contract', () => {
  it('POSTs to /evaluations/:id/sensitivity and returns SensitivityRead', async () => {
    const mock = new MockAdapter(api)
    const responseBody: SensitivityResponse = {
      stabilityMatrix: {
        '1': { '1': 0.8, '3': 0.95, '5': 1.0 },
        '2': { '1': 0.2, '3': 0.6, '5': 1.0 },
      },
      confidenceIntervals: [
        { locationId: 1, mean: 0.52, lower: 0.4, upper: 0.6 },
        { locationId: 2, mean: 0.18, lower: 0.1, upper: 0.3 },
      ],
      rankingIntervals: [
        { locationId: 1, mean: 0.52, lower: 0.4, upper: 0.6 },
        { locationId: 2, mean: 0.18, lower: 0.1, upper: 0.3 },
      ],
      cstarHistogram: {
        binEdges: [0, 0.5, 1],
        countsByLocation: { '1': [50, 50], '2': [70, 30] },
      },
      convergence: {
        iterations: [1, 10, 100],
        meanByLocation: { '1': [0.5, 0.51, 0.52], '2': [0.2, 0.19, 0.18] },
      },
    }
    mock.onPost('/evaluations/7/sensitivity').reply(200, responseBody)

    const { data } = await api.post<SensitivityResponse>('/evaluations/7/sensitivity', {
      iterations: 200,
      perturbation: 0.1,
    })

    expect(data.stabilityMatrix).toHaveProperty('1')
    expect(data.confidenceIntervals).toHaveLength(2)
    mock.restore()
  })

  it('maps 404 to NotFoundError', async () => {
    const mock = new MockAdapter(api)
    mock.onPost('/evaluations/9999/sensitivity').reply(404, { detail: 'Not found' })
    await expect(
      api.post('/evaluations/9999/sensitivity', { iterations: 200, perturbation: 0.1 })
    ).rejects.toBeInstanceOf(NotFoundError)
    mock.restore()
  })

  it('maps 422 to ValidationError with detail message', async () => {
    const mock = new MockAdapter(api)
    mock.onPost('/evaluations/1/sensitivity').reply(422, {
      detail: [{ msg: 'perturbation must be > 0', loc: ['body', 'perturbation'] }],
    })
    await expect(
      api.post('/evaluations/1/sensitivity', { iterations: 200, perturbation: 0 })
    ).rejects.toMatchObject({
      name: 'ValidationError',
      detail: expect.stringContaining('perturbation'),
    })
    mock.restore()
  })
})
