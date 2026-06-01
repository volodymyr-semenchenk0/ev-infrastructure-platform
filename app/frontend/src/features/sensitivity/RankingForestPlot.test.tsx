import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RankingForestPlot } from './RankingForestPlot'

describe('RankingForestPlot', () => {
  it('renders the plot container for a multi-location ranking', () => {
    const { container } = render(
      <RankingForestPlot
        rankingIntervals={[
          { locationId: 1, cstar: 0.6, lower: 0.4, upper: 0.8 },
          { locationId: 2, cstar: 0.45, lower: 0.3, upper: 0.6 },
        ]}
        nameByLocationId={{ 1: 'Alpha', 2: 'Beta' }}
      />,
    )

    expect(
      container.querySelector('[aria-label="Forest-plot інтервалів рангів за C*"]'),
    ).toBeInTheDocument()
  })

  it('renders nothing when there are no locations', () => {
    const { container } = render(<RankingForestPlot rankingIntervals={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
