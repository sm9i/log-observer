import { Navigate, Route, Routes } from 'react-router-dom'
import { LogObserverPage } from '../pages/LogObserverPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LogObserverPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
