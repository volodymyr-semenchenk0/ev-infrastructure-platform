import { Outlet } from 'react-router-dom'

import { Header } from './Header'

// Workbench layout: header only. The page itself owns the left sidebar
// (accordion sections) and the right map pane so that fullscreen routes
// like /details can take the full width below the header.
export function WorkbenchLayout() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
