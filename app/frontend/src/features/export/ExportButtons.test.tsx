import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { API_BASE_URL } from '@/lib/api'

import { ExportButtons } from './ExportButtons'

describe('ExportButtons', () => {
  it('renders two anchors that hit /evaluations/{id}/export with csv and json formats', () => {
    render(<ExportButtons evaluationId={42} />)
    const csv = screen.getByRole('link', { name: /CSV/ })
    const json = screen.getByRole('link', { name: /JSON/ })

    expect(csv.getAttribute('href')).toBe(
      `${API_BASE_URL}/evaluations/42/export?format=csv`,
    )
    expect(json.getAttribute('href')).toBe(
      `${API_BASE_URL}/evaluations/42/export?format=json`,
    )
  })

  it('sets the download attribute so browsers save the file instead of navigating', () => {
    render(<ExportButtons evaluationId={7} />)
    expect(
      screen.getByRole('link', { name: /CSV/ }).getAttribute('download'),
    ).toBe('evaluation-7.csv')
    expect(
      screen.getByRole('link', { name: /JSON/ }).getAttribute('download'),
    ).toBe('evaluation-7.json')
  })

  it('prefixes the button label when a label prop is provided', () => {
    render(<ExportButtons evaluationId={1} label="Завантажити" />)
    expect(screen.getByRole('link', { name: /Завантажити CSV/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Завантажити JSON/ })).toBeTruthy()
  })
})
