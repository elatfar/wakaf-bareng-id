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
  TrendingUp,
  Target,
  Bell,
  CheckCircle2,
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
      <CardContent className="p-3.5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-6 w-20 mt-1" />
            ) : (
              <p className="text-xl font-bold mt-1 leading-none" style={{ color: MAROON }}>
                {value}
              </p>
            )}
            {sub && <p className="text-[10px] text-muted-foreground mt-1 leading-none">{sub}</p>}
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
      className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-[#B8863F]/50 hover:bg-muted/40"
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </div>
      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: MAROON }}>
        {label}
      </span>
    </button>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: donaturRes, isLoading: l1 } = useQuery({ queryKey: ['donatur'], queryFn: () => donaturApi.list() })
  const { data: trxRes, isLoading: l2 } = useQuery({ queryKey: ['transaksi'], queryFn: () => transaksiApi.list() })
  const { data: sertRes, isLoading: l3 } = useQuery({ queryKey: ['sertifikat'], queryFn: () => sertifikatApi.list() })
  const { data: programRes } = useQuery({ queryKey: ['program'], queryFn: () => programApi.list({ aktif: true }) })
  const { data: programSummary } = useQuery({ queryKey: ['program-summary'], queryFn: () => programApi.getSummary() })

  const totalWakafTerkumpul = trxRes?.data?.data
    ?.filter((t) => t.status === 'terverifikasi' && (t as any).tipe === 'wakaf')
    .reduce((sum, t) => sum + Number(t.jumlah), 0) ?? 0

  const totalZakatTerkumpul = trxRes?.data?.data
    ?.filter((t) => t.status === 'terverifikasi' && (t as any).tipe === 'zakat')
    .reduce((sum, t) => sum + Number(t.jumlah), 0) ?? 0

  const totalTerkumpul = totalWakafTerkumpul + totalZakatTerkumpul

  const recentTrx = trxRes?.data?.data?.slice(0, 5) ?? []
  const programs = programRes?.data?.data?.filter((p) => p.aktif) ?? []

  const programsWithProgress = programs.map(p => {
    const programTrx = trxRes?.data?.data?.filter(t => t.programId === p.id && t.status === 'terverifikasi') ?? []
    const totalProgram = programTrx.reduce((sum, t) => sum + Number(t.jumlah), 0)
    const target = p.targetDana ? Number(p.targetDana) : null
    const progress = target && target > 0 ? Math.min(100, (totalProgram / target) * 100) : 0
    return {
      ...p,
      totalTerkumpul: totalProgram,
      progress,
      target,
    }
  })

  const sortedPrograms = programsWithProgress.sort((a, b) => b.progress - a.progress)

  const nearCompletion = sortedPrograms.filter(p => p.progress >= 80 && p.progress < 100)
  const recentlyCompleted = sortedPrograms.filter(p => p.progress >= 100)
  const needsAttention = sortedPrograms.filter(p => p.progress < 30 && p.target !== null)

  type ProgramStat = { terkumpul: number; trxCount: number; donaturIds: Set<string> }

  const statsPerProgram = (trxRes?.data?.data ?? []).reduce<Record<string, ProgramStat>>((acc, t) => {
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
    <div className="space-y-4">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold leading-none" style={{ color: MAROON }}>
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Ringkasan aktivitas wakaf</p>
        </div>

        {/* Quick Actions at the top */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <QuickActionCard label="Catat Transaksi" icon={Plus} onClick={() => navigate('/transaksi')} />
          <QuickActionCard label="Tambah Donatur" icon={UserPlus} onClick={() => navigate('/donatur')} />
          <QuickActionCard label="Sertifikat" icon={ScrollText} onClick={() => navigate('/sertifikat')} />
          <QuickActionCard label="Pengaturan" icon={Settings} onClick={() => navigate('/pengaturan')} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Donatur" value={donaturRes?.data?.data?.length ?? 0} icon={Users} loading={l1} />
        <StatCard label="Total Transaksi" value={trxRes?.data?.data?.length ?? 0} icon={Wallet} loading={l2} />
        <StatCard label="Sertifikat Terbit" value={sertRes?.data?.data?.length ?? 0} icon={ScrollText} loading={l3} />
        <StatCard
          label="Total Terkumpul"
          value={`Rp ${totalTerkumpul.toLocaleString('id-ID')}`}
          icon={Coins}
          sub="transaksi terverifikasi"
          loading={l2}
        />
      </div>

      {/* Breakdown Wakaf & Zakat */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Wakaf Terkumpul"
          value={`Rp ${totalWakafTerkumpul.toLocaleString('id-ID')}`}
          icon={Coins}
          sub="seluruh transaksi wakaf"
          loading={l2}
        />
        <StatCard
          label="Zakat Terkumpul"
          value={`Rp ${totalZakatTerkumpul.toLocaleString('id-ID')}`}
          icon={Wallet}
          sub="zakat fitrah, maal, dsb"
          loading={l2}
        />
      </div>

      {/* Program Statistics Summary */}
      {programSummary?.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-t-[3px]" style={{ borderTopColor: GOLD }}>
            <CardContent className="p-3.5">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
                >
                  <Target className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                    Total Target Dana
                  </p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: MAROON }}>
                    Rp {programSummary.data.totalTarget.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-none">
                    {programSummary.data.totalProgramAktif} program aktif
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-[3px]" style={{ borderTopColor: GOLD }}>
            <CardContent className="p-3.5">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
                >
                  <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                    Overall Progress
                  </p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: MAROON }}>
                    {programSummary.data.overallProgress.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-none">
                    dari total target
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-[3px]" style={{ borderTopColor: GOLD }}>
            <CardContent className="p-3.5">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
                >
                  <Coins className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                    Dana Terkumpul
                  </p>
                  <p className="text-xl font-bold mt-1 leading-none" style={{ color: MAROON }}>
                    Rp {programSummary.data.totalTerkumpul.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-none">
                    {((programSummary.data.totalTerkumpul / programSummary.data.totalTarget) * 100).toFixed(1)}% dari target
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications & Alerts */}
      {(nearCompletion.length > 0 || recentlyCompleted.length > 0 || needsAttention.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" style={{ color: GOLD }} />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notifikasi</p>
          </div>

          {recentlyCompleted.length > 0 && (
            <Card className="border-l-4" style={{ borderLeftColor: '#10b981' }}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs text-green-600 leading-none">Target Tercapai!</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {recentlyCompleted.length} program telah mencapai target dana:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {recentlyCompleted.slice(0, 3).map(p => (
                        <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0">
                          {p.namaProgram}
                        </Badge>
                      ))}
                      {recentlyCompleted.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{recentlyCompleted.length - 3} lainnya
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {nearCompletion.length > 0 && (
            <Card className="border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2.5">
                  <TrendingUp className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs text-amber-600 leading-none">Hampir Tercapai</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {nearCompletion.length} program hampir mencapai target:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {nearCompletion.slice(0, 3).map(p => (
                        <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0">
                          {p.namaProgram} ({p.progress.toFixed(0)}%)
                        </Badge>
                      ))}
                      {nearCompletion.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{nearCompletion.length - 3} lainnya
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {needsAttention.length > 0 && (
            <Card className="border-l-4" style={{ borderLeftColor: '#ef4444' }}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2.5">
                  <Target className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs text-red-600 leading-none">Perlu Perhatian</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {needsAttention.length} program dengan progress rendah:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {needsAttention.slice(0, 3).map(p => (
                        <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0">
                          {p.namaProgram} ({p.progress.toFixed(0)}%)
                        </Badge>
                      ))}
                      {needsAttention.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{needsAttention.length - 3} lainnya
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Program Aktif */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Program Aktif</p>
            {programs.length > 0 && (
              <span className="text-[11px] text-muted-foreground">{programs.length} program</span>
            )}
          </div>
          {programs.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Belum ada program aktif</p>
              </CardContent>
            </Card>
          ) : sortedPrograms.slice(0, 4).map((p) => {
            const stat = statsPerProgram[String(p.id)] ?? { terkumpul: 0, trxCount: 0, donaturIds: new Set<string>() }
            const share = totalTerkumpul > 0 ? (stat.terkumpul / totalTerkumpul) * 100 : 0
            const barWidth = stat.terkumpul === 0 ? 0 : Math.max(4, share)
            const targetProgress = p.target && p.target > 0 ? Math.min(100, (stat.terkumpul / p.target) * 100) : 0

            return (
              <Card key={p.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate" style={{ color: MAROON }}>{p.namaProgram}</p>
                      {p.deskripsi && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.deskripsi}</p>
                      )}
                    </div>
                    {p.target && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px] px-1.5 py-0 font-semibold"
                        style={{
                          borderColor: targetProgress >= 80 ? '#10b981' : targetProgress >= 50 ? '#f59e0b' : GOLD,
                          color: targetProgress >= 80 ? '#10b981' : targetProgress >= 50 ? '#f59e0b' : GOLD
                        }}
                      >
                        {targetProgress.toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-base font-bold leading-none" style={{ color: MAROON }}>
                      Rp {stat.terkumpul.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      terkumpul dari {stat.trxCount} transaksi · {stat.donaturIds.size} donatur
                    </p>
                  </div>

                  {p.target ? (
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: GOLD_SOFT }}>
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: targetProgress >= 80 ? '#10b981' : targetProgress >= 50 ? '#f59e0b' : '#ef4444',
                            width: `${targetProgress}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground leading-none">
                        <span>Rp {stat.terkumpul.toLocaleString('id-ID')}</span>
                        <span>Rp {p.target.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: GOLD_SOFT }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ backgroundColor: GOLD, width: `${barWidth}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {share.toFixed(1)}% dari total dana terkumpul
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Transaksi Terbaru */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Transaksi Terbaru</p>
            <button
              onClick={() => navigate('/transaksi')}
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-70"
              style={{ color: GOLD }}
            >
              Lihat semua
              <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  {['Donatur', 'Program', 'Jumlah', 'Status'].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase py-2 h-9">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrx.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-6">
                      Belum ada transaksi
                    </TableCell>
                  </TableRow>
                ) : recentTrx.map((t) => (
                  <TableRow key={t.id} className="h-10">
                    <TableCell className="font-medium text-xs py-2">{t.donatur?.nama ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">{t.program?.namaProgram ?? '-'}</TableCell>
                    <TableCell className="font-semibold text-xs py-2" style={{ color: GOLD }}>
                      Rp {Number(t.jumlah).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={STATUS_VARIANT[t.status] ?? 'outline'} className="text-[10px] px-1.5 py-0">
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