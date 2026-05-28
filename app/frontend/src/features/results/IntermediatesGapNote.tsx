import { Info } from 'lucide-react'

interface IntermediatesGapNoteProps {
  items: string[]
  formulas: string
}

// Shared explainer rendered in every analytical section that depends on
// intermediates the backend does not yet return. The text body always points
// to ADR-0001 where the contract extension is tracked.
export function IntermediatesGapNote({ items, formulas }: IntermediatesGapNoteProps) {
  return (
    <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">Проміжні величини не виводяться у поточному API</p>
        <p className="mt-1">
          {`Поточний контракт не повертає `}
          {items.map((item, idx) => (
            <span key={item}>
              {idx > 0 && ', '}
              <span className="font-mono">{item}</span>
            </span>
          ))}
          {`. ${formulas}. Розширення контракту обговорено в ADR-0001.`}
        </p>
      </div>
    </div>
  )
}
