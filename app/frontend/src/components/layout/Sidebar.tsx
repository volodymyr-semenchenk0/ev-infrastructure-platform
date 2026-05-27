import { NavLink } from 'react-router-dom'
import {
  Home,
  Users,
  Calculator,
  TrendingUp,
  Map as MapIcon,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

// `/` now points to the new workbench (UI_PLAN §5); the legacy pages stay
// reachable via these deep links until task 11 retires them. The comparison
// page is intentionally absent here per UI_PLAN §3.6.
const nav: NavItem[] = [
  { to: '/', label: 'Головна', icon: Home, end: true },
  { to: '/profile', label: 'Профілі', icon: Users },
  { to: '/calculate', label: 'Розрахунок', icon: Calculator },
  { to: '/results', label: 'Результати', icon: TrendingUp },
  { to: '/map', label: 'Карта', icon: MapIcon },
  { to: '/sensitivity', label: 'Чутливість', icon: Activity },
]

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r bg-card">
      <nav className="flex flex-col gap-1 p-4">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
