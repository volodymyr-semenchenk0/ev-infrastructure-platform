import { Outlet } from 'react-router-dom'

import { Header } from './Header'

// Workbench layout: header only. The page itself owns the full content
// (the stepper and the active step's panel), so this wrapper just exposes the
// header and an outlet for the consolidated home page.
export function WorkbenchLayout() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main
        id="workbench-main"
        aria-label="Робоча область"
        className="flex flex-1 overflow-hidden"
      >
        <Outlet />
      </main>
    </div>
  )
}
