import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CstarHistogram } from './CstarHistogram'

describe('CstarHistogram', () => {
  it('renders a location selector and export buttons', () => {
    render(
      <CstarHistogram
        histogram={{
          edgesByLocation: { '1': [0.4, 0.6, 0.8], '2': [0.3, 0.45, 0.6] },
          countsByLocation: { '1': [100, 100], '2': [120, 80] },
        }}
        rankingIntervals={[
          { locationId: 1, mean: 0.6, lower: 0.4, upper: 0.8 },
          { locationId: 2, mean: 0.45, lower: 0.3, upper: 0.6 },
        ]}
        nameByLocationId={{ 1: 'Alpha', 2: 'Beta' }}
        filenameBase="mc-test"
      />
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PNG' })).toBeInTheDocument()
  })
})
