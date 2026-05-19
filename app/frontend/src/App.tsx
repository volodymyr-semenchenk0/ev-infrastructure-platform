import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { ProfilesPage } from '@/pages/ProfilesPage'
import { CalculatePage } from '@/pages/CalculatePage'
import { ResultsPage } from '@/pages/ResultsPage'
import { MapPage } from '@/pages/MapPage'
import { SensitivityPage } from '@/pages/SensitivityPage'
import { ComparisonPage } from '@/pages/ComparisonPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="profile" element={<ProfilesPage />} />
          <Route path="calculate" element={<CalculatePage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="results/:id" element={<ResultsPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="sensitivity" element={<SensitivityPage />} />
          <Route path="sensitivity/:id" element={<SensitivityPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
