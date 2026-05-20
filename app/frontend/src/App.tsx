import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'
import { HomePage } from '@/pages/HomePage'
import { ProfilesPage } from '@/pages/ProfilesPage'
import { CalculatePage } from '@/pages/CalculatePage'
import { ResultsPage } from '@/pages/ResultsPage'

// Heavy pages (MapLibre, Nivo charts) are split into their own chunks and
// loaded on demand to keep the initial bundle small.
const MapPage = lazy(() =>
  import('@/pages/MapPage').then((m) => ({ default: m.MapPage })),
)
const SensitivityPage = lazy(() =>
  import('@/pages/SensitivityPage').then((m) => ({ default: m.SensitivityPage })),
)
const ComparisonPage = lazy(() =>
  import('@/pages/ComparisonPage').then((m) => ({ default: m.ComparisonPage })),
)

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
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
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
            <Route
              path="comparison"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ComparisonPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
