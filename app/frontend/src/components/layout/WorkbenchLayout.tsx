import { Outlet } from 'react-router-dom'

import { Header } from './Header'

// Workbench layout: header only. The page itself owns the full content
// (the stepper and the active step's panel), so this wrapper just exposes the
// header and an outlet for the consolidated home page.
export function WorkbenchLayout() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main id="workbench-main" aria-label="Робоча область" className="flex flex-1 overflow-hidden">
        <Outlet />
      </main>
      <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        © 2026 Developed by Volodymyr Semenchenko
      </footer>
    </div>
  )
}
