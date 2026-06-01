import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConvergenceChart } from './ConvergenceChart'

describe('ConvergenceChart', () => {
  it('renders the convergence container for the running-mean series', () => {
    const { container } = render(
      <ConvergenceChart
        convergence={{
          iterations: [1, 10, 100],
          meanByLocation: { '1': [0.5, 0.55, 0.6], '2': [0.3, 0.32, 0.33] },
        }}
        rankingIntervals={[
          { locationId: 1, cstar: 0.6, lower: 0.4, upper: 0.8 },
          { locationId: 2, cstar: 0.33, lower: 0.2, upper: 0.45 },
        ]}
        nameByLocationId={{ 1: 'Alpha', 2: 'Beta' }}
      />,
    )

    expect(
      container.querySelector('[aria-label="Збіжність середнього C* за кількістю ітерацій"]'),
    ).toBeInTheDocument()
  })

  it('renders nothing when no locations are provided', () => {
    const { container } = render(
      <ConvergenceChart convergence={{ iterations: [], meanByLocation: {} }} rankingIntervals={[]} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
