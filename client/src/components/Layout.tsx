import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  Users,
  ScrollText,
  Settings,
  LogOut,
} from 'lucide-react'
import { clearToken, getUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transaksi', label: 'Transaksi', icon: Wallet },
  { path: '/donatur', label: 'Donatur', icon: Users },
  { path: '/sertifikat', label: 'Sertifikat', icon: ScrollText },
  { path: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#F7F3ED]">
      <aside className="flex w-64 shrink-0 flex-col bg-[#2B0F17] text-[#F3E7DC]">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D9A85C]/40 text-[#D9A85C]">
            <span className="text-base leading-none" aria-hidden>
              ☪
            </span>
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

        <div className="mx-6 h-px bg-white/10" />

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
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
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[#D9A85C]/35 py-2 text-sm font-medium text-[#E9C88A] transition-colors hover:bg-[#D9A85C]/10"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}