import { Zap } from 'lucide-react'

import { RoleToggle } from './RoleToggle'

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-base font-semibold">СППР вибору локацій ЗС</h1>
      </div>
      <RoleToggle />
    </header>
  )
}
