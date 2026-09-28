import { Navigate, Route, Routes } from 'react-router-dom'
import { LogObserverPage } from '../pages/LogObserverPage'
import { TokenPage } from '../pages/TokenPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LogObserverPage />} />
      <Route path="/login" element={<TokenPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
