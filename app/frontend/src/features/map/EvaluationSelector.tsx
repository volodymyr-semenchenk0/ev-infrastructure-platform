import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEvaluationsHistory } from '@/store/evaluations-history'

interface EvaluationSelectorProps {
  value: number | null
  onChange: (id: number | null) => void
}

export function EvaluationSelector({ value, onChange }: EvaluationSelectorProps) {
  const recent = useEvaluationsHistory((s) => s.recent)
  if (recent.length === 0) return null

  return (
    <Select
      value={value != null ? String(value) : undefined}
      onValueChange={(v) => onChange(Number.parseInt(v, 10))}
    >
      <SelectTrigger className="h-9 w-[260px] text-sm">
        <SelectValue placeholder="Оберіть розрахунок" />
      </SelectTrigger>
      <SelectContent>
        {recent.map((item) => (
          <SelectItem key={item.id} value={String(item.id)}>
            #{item.id} · {item.profileName} ·{' '}
            {new Date(item.createdAt).toLocaleDateString('uk-UA')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
