import type { Theme } from '@nivo/core'

// Shared chart theme that reads shadcn CSS variables. Nivo accepts `hsl(var(...))`
// strings in most places, so the bridge is straightforward.
export function getNivoTheme(): Theme {
  const fg = 'hsl(var(--foreground))'
  const muted = 'hsl(var(--muted-foreground))'
  const grid = 'hsl(var(--border))'
  const bg = 'hsl(var(--background))'

  return {
    background: 'transparent',
    text: { fontSize: 12, fill: fg },
    axis: {
      domain: { line: { stroke: grid, strokeWidth: 1 } },
      ticks: {
        line: { stroke: grid, strokeWidth: 1 },
        text: { fontSize: 11, fill: muted },
      },
      legend: { text: { fontSize: 12, fill: fg } },
    },
    grid: { line: { stroke: grid, strokeDasharray: '3 3', strokeWidth: 1 } },
    tooltip: {
      container: {
        background: bg,
        color: fg,
        fontSize: 12,
        border: `1px solid ${grid}`,
        borderRadius: 6,
        padding: '6px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
    },
    legends: { text: { fill: fg } },
    labels: { text: { fill: fg } },
  }
}
