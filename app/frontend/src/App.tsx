import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { WorkbenchLayout } from '@/components/layout/WorkbenchLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailsPage } from '@/pages/DetailsPage'
import { HomePage } from '@/pages/HomePage'
import { ProfilesPage } from '@/pages/ProfilesPage'
import { CalculatePage } from '@/pages/CalculatePage'
import { ResultsPage } from '@/pages/ResultsPage'
import { WorkbenchPage } from '@/pages/WorkbenchPage'

// Heavy pages (MapLibre, Nivo charts) are split into their own chunks and
// loaded on demand to keep the initial bundle small.
const MapPage = lazy(() =>
  import('@/pages/MapPage').then((m) => ({ default: m.MapPage })),
)
const SensitivityPage = lazy(() =>
  import('@/pages/SensitivityPage').then((m) => ({ default: m.SensitivityPage })),
)
// ComparisonPage is out of scope for the current iteration per UI_PLAN §3.6.
// The page module stays in the tree but the route is unmounted until profile
// comparison comes back into scope.

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* New workbench shell per UI_PLAN §5 (incremental migration). */}
          <Route element={<WorkbenchLayout />}>
            <Route index element={<WorkbenchPage />} />
            <Route path="details" element={<DetailsPage />} />
          </Route>
          {/* Legacy page-based shell kept reachable as deep links until the
              workbench accordions absorb the same flows (tasks 4-10). The
              old pages are deleted in task 11. */}
          <Route element={<AppLayout />}>
            <Route path="home" element={<HomePage />} />
            <Route path="profile" element={<ProfilesPage />} />
            <Route path="calculate" element={<CalculatePage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="results/:id" element={<ResultsPage />} />
            <Route
              path="map"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <MapPage />
                </Suspense>
              }
            />
            <Route
              path="sensitivity"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <SensitivityPage />
                </Suspense>
              }
            />
            <Route
              path="sensitivity/:id"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <SensitivityPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
