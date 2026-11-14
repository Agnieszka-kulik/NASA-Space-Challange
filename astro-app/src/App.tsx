import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home/Home'
import AdminPanel from './features/admin/AdminPanel'
import UserPanel from './features/user/UserPanel'
import { ThemeProvider } from './shared/theme/ThemeContext'
import './shared/theme/CozyTheme.css'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/*" element={<AdminPanel />} />
        <Route path="/user/*" element={<UserPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}
