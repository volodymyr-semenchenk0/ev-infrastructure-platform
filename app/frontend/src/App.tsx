import { BrowserRouter, Route, Routes } from 'react-router-dom'

function HomePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">СППР – EV-зарядні станції Київ</h1>
    </div>
  )
}

function CalculatePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Розрахунок FAHP + TOPSIS</h1>
    </div>
  )
}

function ResultsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Результати</h1>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/calculate" element={<CalculatePage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
