import { Outlet } from 'react-router-dom'

import { Header } from './Header'

// Workbench layout: header only. The page itself owns the left sidebar
// (accordion sections) and the right map pane so that fullscreen routes
// like /details can take the full width below the header.
//
// The skip link is visually hidden until it picks up keyboard focus and
// then jumps the user past the persistent sidebar straight into the main
// content. This is the single most impactful a11y affordance for the
// workbench layout because the sidebar is long.
export function WorkbenchLayout() {
  return (
    <div className="flex h-screen flex-col">
      <a
        href="#workbench-main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-2 focus-visible:top-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground focus-visible:shadow"
      >
        Перейти до основного вмісту
      </a>
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
