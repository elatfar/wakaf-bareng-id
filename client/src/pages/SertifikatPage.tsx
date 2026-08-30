import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sertifikatApi, transaksiApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const SERT_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  terbit: 'default',
  draft: 'outline',
  dicetak: 'secondary',
  dikirim: 'default',
}

export default function SertifikatPage() {
  const qc = useQueryClient()

  const { data: sertRes, isLoading: loadingSert } = useQuery({ queryKey: ['sertifikat'], queryFn: sertifikatApi.list })
  const { data: trxRes, isLoading: loadingTrx } = useQuery({ queryKey: ['transaksi'], queryFn: transaksiApi.list })

  const sertifikatList = sertRes?.data ?? []
  const transaksiList = trxRes?.data ?? []

  const sertTrxIds = new Set(sertifikatList.map((s) => s.transaksiId))
  const bisaGenerate = transaksiList.filter((t) => t.status === 'terverifikasi' && !sertTrxIds.has(t.id))

  const generateMutation = useMutation({
    mutationFn: (transaksiId: number) => sertifikatApi.generate(transaksiId),
    onSuccess: (r) => { if (r.success) qc.invalidateQueries({ queryKey: ['sertifikat'] }) },
  })

  const generateError =
    generateMutation.data && !generateMutation.data.success
      ? generateMutation.data.message
      : generateMutation.isError ? 'Terjadi kesalahan. Silakan coba lagi.' : ''

  function handleWhatsApp(noHp: string | null | undefined, noSertifikat: string, sertId: number) {
    if (!noHp) return alert('Nomor HP donatur tidak tersedia')
    const downloadUrl = sertifikatApi.downloadUrl(sertId)
    const pesan = encodeURIComponent(
      `Assalamu'alaikum, berikut sertifikat wakaf Anda:\nNo: ${noSertifikat}\nUnduh: ${downloadUrl}`
    )
    window.open(`https://wa.me/${noHp.replace(/\D/g, '')}?text=${pesan}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Sertifikat Wakaf</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{sertifikatList.length} sertifikat diterbitkan</p>
      </div>

      {/* Siap generate */}
      {bisaGenerate.length > 0 && (
        <Card className="border-2 border-ring overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 bg-secondary">
            <span>📜</span>
            <span className="font-semibold text-sm text-primary">
              {bisaGenerate.length} transaksi siap diterbitkan sertifikat
            </span>
          </div>
          {generateError && (
            <div className="px-5 py-2 bg-destructive/10">
              <p className="text-xs text-destructive">{generateError}</p>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {['No. Transaksi', 'Donatur', 'Program', 'Jumlah', 'Aksi'].map((h) => (
                  <TableHead key={h} className="text-xs">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bisaGenerate.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.noTransaksi}</TableCell>
                  <TableCell className="font-medium">{t.donatur?.nama ?? '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.program?.namaProgram ?? '-'}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    Rp {Number(t.jumlah).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={generateMutation.isPending}
                      onClick={() => generateMutation.mutate(t.id)}
                    >
                      {generateMutation.isPending ? 'Memproses...' : '🖨 Buat Sertifikat'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Daftar sertifikat */}
      <Card>
        {loadingSert || loadingTrx ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : sertifikatList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-5xl mb-3">📜</span>
            <p className="text-sm text-muted-foreground">Belum ada sertifikat diterbitkan</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['No. Sertifikat', 'Donatur', 'Program', 'Jumlah', 'Tanggal', 'Status', 'Aksi'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sertifikatList.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">{s.noSertifikat}</TableCell>
                  <TableCell className="font-medium">{s.transaksi?.donatur?.nama ?? '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.transaksi?.program?.namaProgram ?? '-'}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {s.transaksi ? `Rp ${Number(s.transaksi.jumlah).toLocaleString('id-ID')}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.tanggalTerbit}</TableCell>
                  <TableCell>
                    <Badge variant={SERT_STATUS_VARIANT[s.status] ?? 'outline'}>{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={sertifikatApi.downloadUrl(s.id)} target="_blank" rel="noreferrer">
                          ⬇ Unduh
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWhatsApp(s.transaksi?.donatur?.noHp, s.noSertifikat, s.id)}
                      >
                        WhatsApp
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
