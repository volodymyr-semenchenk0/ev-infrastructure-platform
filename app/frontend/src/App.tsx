import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { WorkbenchLayout } from '@/components/layout/WorkbenchLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { HomePage } from '@/pages/HomePage'

// Single-page workbench: every step of the operator's workflow lives on the
// root route as a stack of accordions. The legacy /details route is kept as a
// redirect so bookmarks like /details#topsis still resolve to a usable page.

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route element={<WorkbenchLayout />}>
            <Route index element={<HomePage />} />
            <Route path="details" element={<Navigate to="/" replace />} />
            <Route path="details/*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
