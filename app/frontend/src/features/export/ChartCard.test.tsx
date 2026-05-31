import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChartCard } from './ChartCard'

describe('ChartCard', () => {
  it('renders the title, export buttons and the chart body', () => {
    render(
      <ChartCard title="Тестовий графік" filenameBase="test">
        <div data-testid="chart-body" />
      </ChartCard>,
    )

    expect(screen.getByText('Тестовий графік')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PNG' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SVG' })).toBeInTheDocument()
    expect(screen.getByTestId('chart-body')).toBeInTheDocument()
  })

  it('renders an optional header control', () => {
    render(
      <ChartCard title="З контролом" filenameBase="test" controls={<button>Ctl</button>}>
        <div />
      </ChartCard>,
    )

    expect(screen.getByRole('button', { name: 'Ctl' })).toBeInTheDocument()
  })
})
