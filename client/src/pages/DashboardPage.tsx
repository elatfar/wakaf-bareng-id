import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Wallet,
  ScrollText,
  Coins,
  Plus,
  UserPlus,
  Settings,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { donaturApi, transaksiApi, sertifikatApi, programApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const MAROON = '#2B0F17'
const GOLD = '#B8863F'
const GOLD_SOFT = '#F3E7DC'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  terverifikasi: 'default',
  pending: 'secondary',
  batal: 'destructive',
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  loading,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  sub?: string
  loading?: boolean
}) {
  return (
    <Card className="border-t-[3px]" style={{ borderTopColor: GOLD }}>
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-0.5" style={{ color: MAROON }}>
                {value}
              </p>
            )}
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionCard({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-[#B8863F]/50"
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <span className="text-center text-xs font-semibold" style={{ color: MAROON }}>
        {label}
      </span>
    </button>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: donaturRes, isLoading: l1 } = useQuery({ queryKey: ['donatur'], queryFn: donaturApi.list })
  const { data: trxRes, isLoading: l2 } = useQuery({ queryKey: ['transaksi'], queryFn: transaksiApi.list })
  const { data: sertRes, isLoading: l3 } = useQuery({ queryKey: ['sertifikat'], queryFn: sertifikatApi.list })
  const { data: programRes } = useQuery({ queryKey: ['program'], queryFn: () => programApi.list() })

  const totalTerkumpul = trxRes?.data
    ?.filter((t) => t.status === 'terverifikasi')
    .reduce((sum, t) => sum + Number(t.jumlah), 0) ?? 0

  const recentTrx = trxRes?.data?.slice(0, 5) ?? []
  const programs = programRes?.data?.filter((p) => p.aktif) ?? []

  type ProgramStat = { terkumpul: number; trxCount: number; donaturIds: Set<string> }

  const statsPerProgram = (trxRes?.data ?? []).reduce<Record<string, ProgramStat>>((acc, t) => {
    if (t.status !== 'terverifikasi') return acc
    const programId = t.program?.id ?? t.programId
    if (programId === undefined || programId === null) return acc
    const key = String(programId)
    if (!acc[key]) acc[key] = { terkumpul: 0, trxCount: 0, donaturIds: new Set() }
    acc[key].terkumpul += Number(t.jumlah)
    acc[key].trxCount += 1
    if (t.donatur?.id !== undefined && t.donatur?.id !== null) acc[key].donaturIds.add(String(t.donatur.id))
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: MAROON }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan aktivitas wakaf</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Donatur" value={donaturRes?.data?.length ?? 0} icon={Users} loading={l1} />
        <StatCard label="Total Transaksi" value={trxRes?.data?.length ?? 0} icon={Wallet} loading={l2} />
        <StatCard label="Sertifikat Terbit" value={sertRes?.data?.length ?? 0} icon={ScrollText} loading={l3} />
        <StatCard
          label="Total Terkumpul"
          value={`Rp ${totalTerkumpul.toLocaleString('id-ID')}`}
          icon={Coins}
          sub="transaksi terverifikasi"
          loading={l2}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Aksi Cepat</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickActionCard label="Catat Transaksi" icon={Plus} onClick={() => navigate('/transaksi')} />
          <QuickActionCard label="Tambah Donatur" icon={UserPlus} onClick={() => navigate('/donatur')} />
          <QuickActionCard label="Generate Sertifikat" icon={ScrollText} onClick={() => navigate('/sertifikat')} />
          <QuickActionCard label="Pengaturan" icon={Settings} onClick={() => navigate('/pengaturan')} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Aktif */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Program Aktif</p>
            {programs.length > 0 && (
              <span className="text-xs text-muted-foreground">{programs.length} program</span>
            )}
          </div>
          {programs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-sm text-muted-foreground">Belum ada program aktif</p>
              </CardContent>
            </Card>
          ) : programs.map((p) => {
            const stat = statsPerProgram[String(p.id)] ?? { terkumpul: 0, trxCount: 0, donaturIds: new Set<string>() }
            const share = totalTerkumpul > 0 ? (stat.terkumpul / totalTerkumpul) * 100 : 0
            const barWidth = stat.terkumpul === 0 ? 0 : Math.max(4, share)
            return (
              <Card key={p.id}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: MAROON }}>{p.namaProgram}</p>
                      {p.deskripsi && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.deskripsi}</p>
                      )}
                    </div>
                    {stat.terkumpul > 0 && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px] font-semibold"
                        style={{ borderColor: GOLD, color: GOLD }}
                      >
                        {share.toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-lg font-bold leading-tight" style={{ color: MAROON }}>
                      Rp {stat.terkumpul.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      terkumpul dari {stat.trxCount} transaksi · {stat.donaturIds.size} donatur
                    </p>
                  </div>

                  <div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: GOLD_SOFT }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ backgroundColor: GOLD, width: `${barWidth}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {share.toFixed(1)}% dari total dana terkumpul
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Transaksi Terbaru */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaksi Terbaru</p>
            <button
              onClick={() => navigate('/transaksi')}
              className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: GOLD }}
            >
              Lihat semua
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  {['Donatur', 'Program', 'Jumlah', 'Status'].map((h) => (
                    <TableHead key={h} className="text-xs uppercase">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrx.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                      Belum ada transaksi
                    </TableCell>
                  </TableRow>
                ) : recentTrx.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.donatur?.nama ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.program?.namaProgram ?? '-'}</TableCell>
                    <TableCell className="font-semibold" style={{ color: GOLD }}>
                      Rp {Number(t.jumlah).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status] ?? 'outline'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  )
}