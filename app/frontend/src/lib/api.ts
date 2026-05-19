import axios, { AxiosError, type AxiosInstance } from 'axios'

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(public detail: string) {
    super(detail)
    this.name = 'ValidationError'
  }
}

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | Array<{ msg: string }> }>) => {
    if (!error.response) {
      return Promise.reject(new Error('Сервер недоступний'))
    }

    const { status, data } = error.response

    if (status === 404) {
      return Promise.reject(new NotFoundError())
    }

    if (status === 422) {
      const detail = data?.detail
      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg).join('; ')
            : 'Помилка валідації'
      return Promise.reject(new ValidationError(message))
    }

    if (status >= 500) {
      return Promise.reject(new Error('Сервер недоступний'))
    }

    return Promise.reject(error)
  },
)
