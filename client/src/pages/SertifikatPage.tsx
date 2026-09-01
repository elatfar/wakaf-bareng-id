import { useQuery } from '@tanstack/react-query'
import { sertifikatApi, transaksiApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default function SertifikatPage() {
  const { data: sertRes, isLoading: loadingSert } = useQuery({ queryKey: ['sertifikat'], queryFn: sertifikatApi.list })
  const { data: trxRes, isLoading: loadingTrx } = useQuery({ queryKey: ['transaksi'], queryFn: transaksiApi.list })

  const sertifikatList = sertRes?.data ?? []
  const transaksiList = trxRes?.data ?? []

  // All terverifikasi transaksi — both with and without sertifikat
  const terverifikasiTrx = transaksiList.filter((t) => t.status === 'terverifikasi')

  // Map transaksiId → sertifikat for lookup
  const sertByTrxId = new Map(sertifikatList.map((s) => [s.transaksiId, s]))

  function handleWhatsApp(noHp: string | null | undefined, transaksiId: number, noSertifikat?: string) {
    if (!noHp) return alert('Nomor HP donatur tidak tersedia')
    const pdfUrl = sertifikatApi.pdfUrlByTrx(transaksiId)
    const label = noSertifikat ? `No: ${noSertifikat}` : 'sertifikat wakaf Anda'
    const pesan = encodeURIComponent(
      `Assalamu'alaikum, berikut ${label}.\nUnduh PDF: ${pdfUrl}`
    )
    window.open(`https://wa.me/${noHp.replace(/\D/g, '')}?text=${pesan}`, '_blank')
  }

  const isLoading = loadingSert || loadingTrx

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Sertifikat Wakaf</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {terverifikasiTrx.length} transaksi terverifikasi · {sertifikatList.length} sertifikat diterbitkan
        </p>
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
                {['Donatur', 'Program', 'Jumlah', 'Tanggal', 'No. Sertifikat', 'Aksi'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {terverifikasiTrx.map((t) => {
                const sert = sertByTrxId.get(t.id)
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.donatur?.nama ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.program?.namaProgram ?? '-'}</TableCell>
                    <TableCell className="font-semibold text-primary">
                      Rp {Number(t.jumlah).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.tanggal ?? '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sert?.noSertifikat ?? <span className="text-muted-foreground italic">Belum diterbitkan</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="default" size="sm" asChild>
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
                          onClick={() => handleWhatsApp(t.donatur?.noHp, t.id, sert?.noSertifikat)}
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
    </div>
  )
}
