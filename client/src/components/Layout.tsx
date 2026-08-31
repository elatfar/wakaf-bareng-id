import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Wallet,
  Users,
  FolderOpen,
  ScrollText,
  FileCodeCorner,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
} from 'lucide-react'
import { clearToken, getUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transaksi', label: 'Transaksi', icon: Wallet },
  { path: '/donatur', label: 'Donatur', icon: Users },
  { path: '/program', label: 'Program', icon: FolderOpen },
  { path: '/sertifikat', label: 'Sertifikat', icon: ScrollText },
  { path: '/template', label: 'Template Sertifikat', icon: FileCodeCorner },
  { path: '/statistik', label: 'Statistik', icon: BarChart3 },
  { path: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = getUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  return (
    <div className="flex min-h-screen bg-[#F7F3ED]">
      {/* Mobile Header - Fixed */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#2B0F17] text-[#F3E7DC] border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D9A85C]/40 text-[#D9A85C]">
                <img
                  src="/logo-wakaf-bareng.svg"
                  alt="Logo Wakaf Bareng"
                  className="h-4 w-4 object-contain"
                />
              </div>
              <div>
                <div className="text-[13px] font-semibold tracking-tight text-[#F0DCC0]">
                  Wakaf Bareng
                </div>
                <div className="text-[10px] text-[#C9A79C]">
                  Yayasan Adab Insan Mulia
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            title="Keluar"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar - Fixed on Desktop, Slide-in on Mobile */}
      <aside 
        className={cn(
          "fixed lg:static z-50 h-full lg:h-auto bg-[#2B0F17] text-[#F3E7DC] transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "w-64 shrink-0 flex flex-col"
        )}
      >
        {/* Logo - Desktop */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D9A85C]/40 text-[#D9A85C]">
            <img
              src="/logo-wakaf-bareng.svg"
              alt="Logo Wakaf Bareng"
              className="h-5 w-5 object-contain"
            />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-[#F0DCC0]">
              Wakaf Bareng
            </div>
            <div className="text-[11px] text-[#C9A79C]">
              Yayasan Adab Insan Mulia
            </div>
          </div>
        </div>

        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D9A85C]/40 text-[#D9A85C]">
            <img
              src="/logo-wakaf-bareng.svg"
              alt="Logo Wakaf Bareng"
              className="h-4 w-4 object-contain"
            />
          </div>
          <div>
            <div className="text-[13px] font-semibold tracking-tight text-[#F0DCC0]">
              Wakaf Bareng
            </div>
            <div className="text-[10px] text-[#C9A79C]">
              Yayasan Adab Insan Mulia
            </div>
          </div>
        </div>

        <div className="mx-6 h-px bg-white/10" />

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
                onClick={closeMobileMenu}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md py-2.5 pl-3 pr-3 text-sm transition-colors',
                  isActive
                    ? 'bg-white/[0.06] text-[#E9C88A]'
                    : 'text-[#DCC9BE]/80 hover:bg-white/[0.04] hover:text-[#F3E7DC]'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#D9A85C] transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                  aria-hidden
                />
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    isActive ? 'text-[#D9A85C]' : 'text-[#DCC9BE]/60 group-hover:text-[#F3E7DC]'
                  )}
                  strokeWidth={1.75}
                />
                <span className={isActive ? 'font-medium' : undefined}>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mx-6 h-px bg-white/10" />

        {/* User + Logout */}
        <div className="space-y-4 px-6 py-5">
          {user && (
            <div>
              <p className="text-sm font-medium text-[#F3E7DC]">{user.nama}</p>
              <p className="text-[11px] uppercase tracking-wide text-[#C9A79C]">
                {user.role}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="hidden lg:flex w-full items-center justify-center gap-2 rounded-md border border-[#D9A85C]/35 py-2 text-sm font-medium text-[#E9C88A] transition-colors hover:bg-[#D9A85C]/10"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content - Scrollable independently */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0 overflow-y-auto min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}