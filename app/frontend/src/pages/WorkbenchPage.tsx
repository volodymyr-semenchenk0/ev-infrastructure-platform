import { MapPane } from '@/features/workbench/MapPane'
import { WorkbenchSidebar } from '@/features/workbench/WorkbenchSidebar'

// Workbench: persistent two-column layout per UI_PLAN §5 (sidebar + map).
// Accordion sections live in WorkbenchSidebar; the right pane hosts the
// MapLibre map. Future tasks add layer toggles and stability shading.
export function WorkbenchPage() {
  return (
    <>
      <WorkbenchSidebar />
      <MapPane />
    </>
  )
}
