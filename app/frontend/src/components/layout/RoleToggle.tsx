import { cn } from '@/lib/utils'
import { useRoleStore, type AppRole } from '@/store/role-store'

const OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Адміністратор' },
  { value: 'opr', label: 'ОПР' },
]

export function RoleToggle() {
  const role = useRoleStore((s) => s.role)
  const setRole = useRoleStore((s) => s.setRole)

  return (
    <div
      role="group"
      aria-label="Режим роботи"
      className="flex rounded-full border bg-muted p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = role === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => setRole(opt.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
