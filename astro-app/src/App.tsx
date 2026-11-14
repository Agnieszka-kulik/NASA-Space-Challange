import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home/Home'
import AdminPanel from './features/admin/AdminPanel'
import UserPanel from './features/user/UserPanel'
import DigitalTwinPage from './features/twin/DigitalTwinPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/*" element={<AdminPanel />} />
      <Route path="/user/*" element={<UserPanel />} />
      <Route path="/twin/:astronautId?" element={<DigitalTwinPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
