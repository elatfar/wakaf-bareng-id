import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Target, Users, Calendar, BarChart3, PieChart } from 'lucide-react'
import { programApi, transaksiApi, donaturApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const MAROON = '#2B0F17'
const GOLD = '#B8863F'
const GOLD_SOFT = '#F3E7DC'

export default function StatisticsPage() {
  const navigate = useNavigate()

  const { data: programSummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['program-summary'],
    queryFn: () => programApi.getSummary(),
  })

  const { data: trxRes, isLoading: loadingTrx } = useQuery({
    queryKey: ['transaksi'],
    queryFn: () => transaksiApi.list(),
  })

  const { data: donaturRes, isLoading: loadingDonatur } = useQuery({
    queryKey: ['donatur'],
    queryFn: () => donaturApi.list(),
  })

  const programs = (programSummary?.data as any)?.programStats ?? []
  const totalTarget = (programSummary?.data as any)?.totalTarget ?? 0
  const totalTerkumpul = (programSummary?.data as any)?.totalTerkumpul ?? 0
  const overallProgress = (programSummary?.data as any)?.overallProgress ?? 0

  const transactions = trxRes?.data?.data ?? []
  const verifiedTrx = transactions.filter((t) => t.status === 'terverifikasi')
  const totalVerified = verifiedTrx.reduce((sum, t) => sum + Number(t.jumlah), 0)

  const donaturCount = donaturRes?.data?.data?.length ?? 0

  // Calculate distribution by category
  const categoryDistribution = programs.reduce((acc: Record<string, { count: number; total: number }>, p: any) => {
    const kategori = p.kategori || 'Tanpa Kategori'
    if (!acc[kategori]) acc[kategori] = { count: 0, total: 0 }
    acc[kategori].count += 1
    acc[kategori].total += p.totalTerkumpul
    return acc
  }, {} as Record<string, { count: number; total: number }>)

  const categoryColors = ['#B8863F', '#2B0F17', '#10b981', '#f59e0b', '#3b82f6', '#ef4444']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: MAROON }}>Statistik Program</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analisis performa program wakaf</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-t-[3px]" style={{ borderTopColor: GOLD }}>
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
              >
                <Target className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Target
                </p>
                {loadingSummary ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-0.5" style={{ color: MAROON }}>
                    Rp {totalTarget.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-[3px]" style={{ borderTopColor: GOLD }}>
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
              >
                <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Terkumpul
                </p>
                {loadingTrx ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-0.5" style={{ color: MAROON }}>
                    Rp {totalTerkumpul.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-[3px]" style={{ borderTopColor: GOLD }}>
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
              >
                <Users className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Donatur
                </p>
                {loadingDonatur ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-0.5" style={{ color: MAROON }}>
                    {donaturCount}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-[3px]" style={{ borderTopColor: GOLD }}>
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
              >
                <BarChart3 className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Overall Progress
                </p>
                {loadingSummary ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-0.5" style={{ color: MAROON }}>
                    {overallProgress.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program Performance Bar Chart */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5" style={{ color: GOLD }} />
              <h3 className="font-semibold" style={{ color: MAROON }}>Performa Program</h3>
            </div>
            
            {loadingSummary ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : programs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data program</p>
            ) : (
              <div className="space-y-3">
                {programs.slice(0, 5).map((p: any) => {
                  const progress = p.targetDana && p.targetDana > 0 
                    ? Math.min(100, (p.totalTerkumpul / p.targetDana) * 100) 
                    : 0
                  const color = progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444'
                  
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate">{p.namaProgram}</span>
                        <span style={{ color }}>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-4 rounded-full" style={{ backgroundColor: GOLD_SOFT }}>
                        <div 
                          className="h-4 rounded-full transition-all duration-500" 
                          style={{ backgroundColor: color, width: `${progress}%` }} 
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-5 w-5" style={{ color: GOLD }} />
              <h3 className="font-semibold" style={{ color: MAROON }}>Distribusi Kategori</h3>
            </div>
            
            {loadingSummary ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : Object.keys(categoryDistribution).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data kategori</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categoryDistribution).map(([kategori, data]) => {
                  const categoryData = data as { count: number; total: number }
                  const percentage = totalTerkumpul > 0 ? (categoryData.total / totalTerkumpul) * 100 : 0
                  const color = categoryColors[Object.keys(categoryDistribution).indexOf(kategori) % categoryColors.length]
                  
                  return (
                    <div key={kategori} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{kategori}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-4 rounded-full" style={{ backgroundColor: GOLD_SOFT }}>
                        <div 
                          className="h-4 rounded-full transition-all duration-500" 
                          style={{ backgroundColor: color, width: `${percentage}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{categoryData.count} program</span>
                        <span>Rp {categoryData.total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" style={{ color: GOLD }} />
            <h3 className="font-semibold" style={{ color: MAROON }}>Ringkasan Transaksi</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: GOLD_SOFT }}>
              <p className="text-xs text-muted-foreground mb-1">Total Transaksi</p>
              <p className="text-2xl font-bold" style={{ color: MAROON }}>
                {loadingTrx ? <Skeleton className="h-8 w-16" /> : transactions.length}
              </p>
            </div>
            
            <div className="p-4 rounded-lg" style={{ backgroundColor: GOLD_SOFT }}>
              <p className="text-xs text-muted-foreground mb-1">Transaksi Terverifikasi</p>
              <p className="text-2xl font-bold" style={{ color: MAROON }}>
                {loadingTrx ? <Skeleton className="h-8 w-16" /> : verifiedTrx.length}
              </p>
            </div>
            
            <div className="p-4 rounded-lg" style={{ backgroundColor: GOLD_SOFT }}>
              <p className="text-xs text-muted-foreground mb-1">Total Dana Terverifikasi</p>
              <p className="text-2xl font-bold" style={{ color: MAROON }}>
                {loadingTrx ? <Skeleton className="h-8 w-24" /> : `Rp ${totalVerified.toLocaleString('id-ID')}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
