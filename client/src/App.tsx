import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { isLoggedIn } from '@/lib/auth'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DonaturPage = lazy(() => import('@/pages/DonaturPage'))
const ProgramPage = lazy(() => import('@/pages/ProgramPage'))
const TransaksiPage = lazy(() => import('@/pages/TransaksiPage'))
const SertifikatPage = lazy(() => import('@/pages/SertifikatPage'))
const TemplateEditorPage = lazy(() => import('@/pages/TemplateEditorPage'))
const PengaturanPage = lazy(() => import('@/pages/PengaturanPage'))
const StatisticsPage = lazy(() => import('@/pages/StatisticsPage'))

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
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground" role="status">Memuat halaman...</div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/donatur" element={<ProtectedLayout><DonaturPage /></ProtectedLayout>} />
      <Route path="/program" element={<ProtectedLayout><ProgramPage /></ProtectedLayout>} />
      <Route path="/transaksi" element={<ProtectedLayout><TransaksiPage /></ProtectedLayout>} />
      <Route path="/sertifikat" element={<ProtectedLayout><SertifikatPage /></ProtectedLayout>} />
      <Route path="/template" element={<ProtectedLayout><TemplateEditorPage /></ProtectedLayout>} />
      <Route path="/pengaturan" element={<ProtectedLayout><PengaturanPage /></ProtectedLayout>} />
      <Route path="/statistik" element={<ProtectedLayout><StatisticsPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to={isLoggedIn() ? '/dashboard' : '/login'} replace />} />
    </Routes>
    </Suspense>
  )
}
