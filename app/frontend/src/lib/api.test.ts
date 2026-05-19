import { describe, it, expect } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { api, NotFoundError, ValidationError } from './api'

describe('api interceptors', () => {
  it('maps 404 response to NotFoundError', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/profiles/9999').reply(404, { detail: 'Not found' })
    await expect(api.get('/profiles/9999')).rejects.toBeInstanceOf(NotFoundError)
    mock.restore()
  })

  it('maps 422 response to ValidationError with detail message', async () => {
    const mock = new MockAdapter(api)
    mock.onPost('/evaluations').reply(422, {
      detail: [{ msg: 'CR > 0.1', loc: ['body'] }],
    })
    await expect(api.post('/evaluations', {})).rejects.toMatchObject({
      name: 'ValidationError',
      detail: expect.stringContaining('CR > 0.1'),
    })
    mock.restore()
  })

  it('maps 500 to generic server-unavailable error', async () => {
    const mock = new MockAdapter(api)
    mock.onGet('/locations').reply(500)
    await expect(api.get('/locations')).rejects.toThrow('Сервер недоступний')
    mock.restore()
  })
})

describe('error classes', () => {
  it('NotFoundError carries default message', () => {
    expect(new NotFoundError().message).toBe('Resource not found')
  })

  it('ValidationError exposes detail', () => {
    const err = new ValidationError('CR > 0.1')
    expect(err.detail).toBe('CR > 0.1')
    expect(err.name).toBe('ValidationError')
  })
})
