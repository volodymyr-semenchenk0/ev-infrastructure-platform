import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { WorkbenchLayout } from '@/components/layout/WorkbenchLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DetailsPage } from '@/pages/DetailsPage'
import { WorkbenchPage } from '@/pages/WorkbenchPage'

// Single-page workbench per UI_PLAN §5. The legacy page-based shell
// (CalculatePage, ResultsPage, …) was retired in task 11 after the
// fullscreen /details view absorbed the matrix editor and the analytical
// tables. Profile comparison stays parked in features/comparison/ per
// UI_PLAN §3.6.

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route element={<WorkbenchLayout />}>
            <Route index element={<WorkbenchPage />} />
            <Route path="details" element={<DetailsPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
