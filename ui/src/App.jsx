import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import DatasetsPage from './pages/DatasetsPage.jsx'
import NewRunPage from './pages/NewRunPage.jsx'
import RunResultsPage from './pages/RunResultsPage.jsx'
import RegressionPage from './pages/RegressionPage.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/datasets" replace />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/datasets/:id" element={<DatasetsPage />} />
          <Route path="/runs/new" element={<NewRunPage />} />
          <Route path="/runs/:id" element={<RunResultsPage />} />
          <Route path="/regression" element={<RegressionPage />} />
        </Routes>
      </main>
    </div>
  )
}
