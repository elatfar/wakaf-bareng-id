import { Navigate, Route, Routes } from 'react-router-dom'
import { isLoggedIn } from '@/lib/auth'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import DonaturPage from '@/pages/DonaturPage'
import ProgramPage from '@/pages/ProgramPage'
import TransaksiPage from '@/pages/TransaksiPage'
import SertifikatPage from '@/pages/SertifikatPage'
import TemplateEditorPage from '@/pages/TemplateEditorPage'
import PengaturanPage from '@/pages/PengaturanPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/donatur" element={<ProtectedLayout><DonaturPage /></ProtectedLayout>} />
      <Route path="/program" element={<ProtectedLayout><ProgramPage /></ProtectedLayout>} />
      <Route path="/transaksi" element={<ProtectedLayout><TransaksiPage /></ProtectedLayout>} />
      <Route path="/sertifikat" element={<ProtectedLayout><SertifikatPage /></ProtectedLayout>} />
      <Route path="/template" element={<ProtectedLayout><TemplateEditorPage /></ProtectedLayout>} />
      <Route path="/pengaturan" element={<ProtectedLayout><PengaturanPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to={isLoggedIn() ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
