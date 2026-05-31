import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RankingForestPlot } from './RankingForestPlot'

describe('RankingForestPlot', () => {
  it('renders export buttons for a multi-location ranking', () => {
    render(
      <RankingForestPlot
        rankingIntervals={[
          { locationId: 1, mean: 0.6, lower: 0.4, upper: 0.8 },
          { locationId: 2, mean: 0.45, lower: 0.3, upper: 0.6 },
        ]}
        nameByLocationId={{ 1: 'Alpha', 2: 'Beta' }}
        filenameBase="mc-test"
      />
    )

    expect(screen.getByRole('button', { name: 'PNG' })).toBeInTheDocument()
  })

  it('renders nothing when there are no locations', () => {
    const { container } = render(<RankingForestPlot rankingIntervals={[]} filenameBase="mc-test" />)

    expect(container).toBeEmptyDOMElement()
  })
})
