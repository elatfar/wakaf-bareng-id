import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sertifikatApi, transaksiApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Pagination from '@/components/Pagination'

const MAROON = '#2B0F17'
const GOLD = '#B8863F'

export default function SertifikatPage() {
  const [tipeTab, setTipeTab] = useState<'semua' | 'wakaf' | 'zakat'>('semua')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data: sertRes, isLoading: loadingSert } = useQuery({
    queryKey: ['sertifikat', page, limit],
    queryFn: () => sertifikatApi.list({ page, limit }),
  })
  const { data: trxRes, isLoading: loadingTrx } = useQuery({
    queryKey: ['transaksi', { tipe: tipeTab !== 'semua' ? tipeTab : undefined }],
    queryFn: () => transaksiApi.list({ tipe: tipeTab !== 'semua' ? tipeTab : undefined }),
  })

  // List all for counts
  const { data: allTrxRes } = useQuery({
    queryKey: ['transaksi', 'all-counts'],
    queryFn: () => transaksiApi.list(),
  })

  const sertifikatList = sertRes?.data?.data ?? []
  const sertPagination = sertRes?.data?.pagination
  const transaksiList = trxRes?.data?.data ?? []
  const allTrx = (allTrxRes?.data?.data ?? []).filter((t) => t.status === 'terverifikasi')

  const countSemua = allTrx.length
  const countWakaf = allTrx.filter(t => (t as any).tipe === 'wakaf' || t.program?.tipe === 'wakaf').length
  const countZakat = allTrx.filter(t => (t as any).tipe === 'zakat' || t.program?.tipe === 'zakat').length

  // All terverifikasi transaksi in current tab
  const terverifikasiTrx = transaksiList.filter((t) => t.status === 'terverifikasi')

  // Map transaksiId → sertifikat for lookup
  const sertByTrxId = new Map(sertifikatList.map((s) => [s.transaksiId, s]))

  function handleWhatsApp(noHp: string | null | undefined, transaksiId: number, noSertifikat?: string, tipe = 'wakaf') {
    if (!noHp) return alert('Nomor HP donatur tidak tersedia')
    const pdfUrl = sertifikatApi.pdfUrlByTrx(transaksiId)
    const jenisLabel = tipe === 'zakat' ? 'sertifikat zakat' : 'sertifikat wakaf'
    const label = noSertifikat ? `No: ${noSertifikat}` : `${jenisLabel} Anda`
    const pesan = encodeURIComponent(
      `Assalamu'alaikum, berikut ${label}.\nUnduh PDF: ${pdfUrl}`
    )
    window.open(`https://wa.me/${noHp.replace(/\D/g, '')}?text=${pesan}`, '_blank')
  }

  const isLoading = loadingSert || loadingTrx

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: MAROON }}>Sertifikat Wakaf & Zakat</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {terverifikasiTrx.length} transaksi terverifikasi · {sertifikatList.length} sertifikat diterbitkan
        </p>
      </div>

      {/* Tabs Tipe Sertifikat */}
      <div className="flex border-b border-border/80 gap-2">
        <button
          type="button"
          onClick={() => setTipeTab('semua')}
          className="pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors"
          style={{
            borderColor: tipeTab === 'semua' ? MAROON : 'transparent',
            color: tipeTab === 'semua' ? MAROON : 'var(--muted-foreground)',
          }}
        >
          Semua ({countSemua})
        </button>
        <button
          type="button"
          onClick={() => setTipeTab('wakaf')}
          className="pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5"
          style={{
            borderColor: tipeTab === 'wakaf' ? GOLD : 'transparent',
            color: tipeTab === 'wakaf' ? MAROON : 'var(--muted-foreground)',
          }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
          Wakaf ({countWakaf})
        </button>
        <button
          type="button"
          onClick={() => setTipeTab('zakat')}
          className="pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5"
          style={{
            borderColor: tipeTab === 'zakat' ? '#10b981' : 'transparent',
            color: tipeTab === 'zakat' ? '#047857' : 'var(--muted-foreground)',
          }}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Zakat ({countZakat})
        </button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : terverifikasiTrx.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-5xl mb-3">📜</span>
            <p className="text-sm text-muted-foreground">Belum ada transaksi terverifikasi</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['Tipe', 'Donatur', 'Program', 'Jumlah', 'Tanggal', 'No. Sertifikat', 'Aksi'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {terverifikasiTrx.map((t) => {
                const sert = sertByTrxId.get(t.id)
                const itemTipe = (t as any).tipe ?? t.program?.tipe ?? 'wakaf'
                const isZakat = itemTipe === 'zakat'
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                        style={{
                          backgroundColor: isZakat ? 'rgba(16, 185, 129, 0.1)' : 'rgba(184, 134, 63, 0.1)',
                          borderColor: isZakat ? '#10b981' : GOLD,
                          color: isZakat ? '#047857' : MAROON,
                        }}
                      >
                        {isZakat ? 'Zakat' : 'Wakaf'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{t.donatur?.nama ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.program?.namaProgram ?? '-'}</TableCell>
                    <TableCell className="font-semibold" style={{ color: isZakat ? '#047857' : MAROON }}>
                      Rp {Number(t.jumlah).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.tanggal ?? '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sert?.noSertifikat ?? <span className="text-muted-foreground italic">Belum diterbitkan</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          asChild
                          style={{ backgroundColor: isZakat ? '#047857' : MAROON, color: '#fff' }}
                        >
                          <a
                            href={sertifikatApi.pdfUrlByTrx(t.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ⬇ Unduh PDF
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWhatsApp(t.donatur?.noHp, t.id, sert?.noSertifikat, itemTipe)}
                        >
                          WhatsApp
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {sertPagination && (
        <Pagination
          currentPage={sertPagination.page}
          totalPages={sertPagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
