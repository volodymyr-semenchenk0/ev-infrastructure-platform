import { describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'

import { api, NotFoundError } from '@/lib/api'

import type { SensitivityResponse } from './useSensitivity'

describe('useSensitivity payload contract', () => {
  it('POSTs to /evaluations/:id/sensitivity and returns SensitivityRead', async () => {
    const mock = new MockAdapter(api)
    const responseBody: SensitivityResponse = {
      stabilityMatrix: { A1: [1, 0], A2: [0, 1] },
      confidenceIntervals: [
        { locationId: 1, low: 0.4, high: 0.6 },
        { locationId: 2, low: 0.1, high: 0.3 },
      ],
    }
    mock.onPost('/evaluations/7/sensitivity').reply(200, responseBody)

    const { data } = await api.post<SensitivityResponse>('/evaluations/7/sensitivity', {
      iterations: 200,
      perturbation: 0.1,
    })

    expect(data.stabilityMatrix).toHaveProperty('A1')
    expect(data.confidenceIntervals).toHaveLength(2)
    mock.restore()
  })

  it('maps 404 to NotFoundError', async () => {
    const mock = new MockAdapter(api)
    mock.onPost('/evaluations/9999/sensitivity').reply(404, { detail: 'Not found' })
    await expect(
      api.post('/evaluations/9999/sensitivity', { iterations: 200, perturbation: 0.1 }),
    ).rejects.toBeInstanceOf(NotFoundError)
    mock.restore()
  })

  it('maps 422 to ValidationError with detail message', async () => {
    const mock = new MockAdapter(api)
    mock.onPost('/evaluations/1/sensitivity').reply(422, {
      detail: [{ msg: 'perturbation must be > 0', loc: ['body', 'perturbation'] }],
    })
    await expect(
      api.post('/evaluations/1/sensitivity', { iterations: 200, perturbation: 0 }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      detail: expect.stringContaining('perturbation'),
    })
    mock.restore()
  })
})
