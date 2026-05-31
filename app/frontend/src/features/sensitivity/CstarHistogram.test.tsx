import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CstarHistogram } from './CstarHistogram'

describe('CstarHistogram', () => {
  it('renders the histogram container for the selected location', () => {
    const { container } = render(
      <CstarHistogram
        histogram={{
          edgesByLocation: { '1': [0.4, 0.6, 0.8], '2': [0.3, 0.45, 0.6] },
          countsByLocation: { '1': [100, 100], '2': [120, 80] },
        }}
        rankingIntervals={[
          { locationId: 1, mean: 0.6, lower: 0.4, upper: 0.8 },
          { locationId: 2, mean: 0.45, lower: 0.3, upper: 0.6 },
        ]}
        selectedLocationId={1}
      />,
    )

    expect(
      container.querySelector('[aria-label="Гістограма розподілу C* для обраної локації"]'),
    ).toBeInTheDocument()
  })
})
