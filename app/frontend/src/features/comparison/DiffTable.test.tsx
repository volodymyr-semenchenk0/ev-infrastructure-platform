import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DiffTable } from './DiffTable'
import type { PairwiseDifference } from './useProfileComparison'

const diffs: PairwiseDifference[] = [
  { locationId: 1, rankA: 1, rankB: 2, delta: -1 }, // B покращив → emerald
  { locationId: 2, rankA: 3, rankB: 3, delta: 0 }, // ніяких змін
  { locationId: 3, rankA: 2, rankB: 5, delta: -3 }, // B покращив сильно
  { locationId: 4, rankA: 4, rankB: 1, delta: 3 }, // B погіршив → red
]

const names = { 1: 'Шулявка', 2: 'Оболонь', 3: 'Позняки', 4: 'Бориспільська' }

describe('DiffTable', () => {
  it('renders one row per pairwise difference', () => {
    render(<DiffTable differences={diffs} nameByLocationId={names} />)
    expect(screen.getAllByRole('row')).toHaveLength(diffs.length + 1) // +header
  })

  it('numbers the rows in input order via the leading # column', () => {
    render(<DiffTable differences={diffs} nameByLocationId={names} />)
    const bodyRows = screen.getAllByRole('row').slice(1) // drop the header row
    const rowNumbers = bodyRows.map((r) => r.querySelector('td')?.textContent)
    expect(rowNumbers).toEqual(['1', '2', '3', '4'])
  })

  it('renders descriptive, non-sortable column headers', () => {
    render(<DiffTable differences={diffs} />)
    expect(screen.getByText('Ранг за профілем A')).toBeInTheDocument()
    expect(screen.getByText('Ранг за профілем B')).toBeInTheDocument()
    expect(screen.getByText('Різниця рангів')).toBeInTheDocument()
    // Headers are plain text, not sort buttons.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('displays the joined location name', () => {
    render(<DiffTable differences={diffs} nameByLocationId={names} />)
    expect(screen.getByText('Шулявка')).toBeTruthy()
    expect(screen.getByText('Бориспільська')).toBeTruthy()
  })

  it('formats positive delta with a leading + and applies a destructive class', () => {
    render(<DiffTable differences={diffs} />)
    const deltaCells = screen.getAllByTestId('delta-cell')
    const positive = deltaCells.find((c) => c.textContent === '+3')
    expect(positive).toBeTruthy()
    expect(positive?.className).toMatch(/red/)
  })

  it('applies emerald class to negative delta cells', () => {
    render(<DiffTable differences={diffs} />)
    const deltaCells = screen.getAllByTestId('delta-cell')
    const negative = deltaCells.find((c) => c.textContent === '-1')
    expect(negative).toBeTruthy()
    expect(negative?.className).toMatch(/emerald/)
  })
})
