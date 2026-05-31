import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AhpMatrix } from './AhpMatrix'
import { identityMatrix, type PairwiseMatrix } from './saaty-scale'

const criteria = ['A', 'B', 'C'].map((code, i) => ({
  id: i + 1,
  code,
  name: `Criterion ${code}`,
}))

describe('AhpMatrix', () => {
  it('renders header row and column with each criterion name', () => {
    render(
      <AhpMatrix
        criteria={criteria}
        matrix={identityMatrix(3)}
        onChange={() => {}}
      />,
    )
    for (const c of criteria) {
      const headers = screen.getAllByText(c.name)
      // each name appears at least twice (row header + column header)
      expect(headers.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('renders 3 Saaty selects for the upper triangle of a 3×3 matrix', () => {
    render(
      <AhpMatrix
        criteria={criteria}
        matrix={identityMatrix(3)}
        onChange={() => {}}
      />,
    )
    // upper triangle of 3×3 has 3 cells: (0,1), (0,2), (1,2)
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
  })

  it('shows reciprocal TFN in lower triangle when upper-triangle cell changes', async () => {
    const user = userEvent.setup()
    let current: PairwiseMatrix = identityMatrix(3)
    const onChange = vi.fn((next: PairwiseMatrix) => {
      current = next
    })
    const { rerender } = render(
      <AhpMatrix criteria={criteria} matrix={current} onChange={onChange} />,
    )

    const selects = screen.getAllByRole('combobox')
    await user.click(selects[0])
    const option = await screen.findByRole('option', { name: '3' })
    await user.click(option)

    expect(onChange).toHaveBeenCalled()
    rerender(
      <AhpMatrix criteria={criteria} matrix={current} onChange={onChange} />,
    )

    const lowerCell = screen.getByTestId('cell-1-0')
    expect(within(lowerCell).getByText(/1\/3/)).toBeInTheDocument()
  })
})
