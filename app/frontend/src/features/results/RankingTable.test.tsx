import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RankingTable, type RankingRow } from './RankingTable'

const rows: RankingRow[] = [
  { locationId: 1, rank: 3, closeness: 0.4, sPlus: 0.5, sMinus: 0.33, name: 'A', district: 'D1' },
  { locationId: 2, rank: 1, closeness: 0.9, sPlus: 0.1, sMinus: 0.9, name: 'B', district: 'D2' },
  { locationId: 3, rank: 2, closeness: 0.6, sPlus: 0.3, sMinus: 0.45, name: 'C', district: 'D3' },
]

describe('RankingTable', () => {
  it('renders one row per ranking item', () => {
    render(<RankingTable rows={rows} />)
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1) // +header
  })

  it('sorts by rank ascending by default', () => {
    render(<RankingTable rows={rows} />)
    const cells = screen.getAllByTestId('rank-cell')
    expect(cells.map((c) => c.textContent)).toEqual(['1', '2', '3'])
  })

  it('clicking «C*» header switches to closeness descending', async () => {
    const user = userEvent.setup()
    render(<RankingTable rows={rows} />)
    const closenessHeader = screen.getByRole('button', { name: /C\*/ })
    await user.click(closenessHeader)
    const cells = screen.getAllByTestId('rank-cell')
    // sorted by closeness desc: 0.9 (rank 1), 0.6 (rank 2), 0.4 (rank 3)
    expect(cells.map((c) => c.textContent)).toEqual(['1', '2', '3'])
  })

  it('second click on «C*» header inverts to ascending', async () => {
    const user = userEvent.setup()
    render(<RankingTable rows={rows} />)
    const closenessHeader = screen.getByRole('button', { name: /C\*/ })
    await user.click(closenessHeader)
    await user.click(closenessHeader)
    const cells = screen.getAllByTestId('rank-cell')
    // sorted by closeness asc: 0.4 (rank 3), 0.6 (rank 2), 0.9 (rank 1)
    expect(cells.map((c) => c.textContent)).toEqual(['3', '2', '1'])
  })
})
