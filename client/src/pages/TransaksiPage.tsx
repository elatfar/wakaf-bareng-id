import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transaksiApi, donaturApi, programApi } from '@/lib/api'
import type { BuatTransaksiInput } from 'shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  terverifikasi: 'default',
  pending: 'secondary',
  batal: 'destructive',
}

const emptyForm: BuatTransaksiInput = {
  donaturId: 0,
  programId: 0,
  jenis: 'uang',
  jumlah: 0,
  metodePembayaran: '',
  catatan: '',
}

export default function TransaksiPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BuatTransaksiInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const { data: trxRes, isLoading } = useQuery({ queryKey: ['transaksi'], queryFn: transaksiApi.list })
  const { data: donaturRes } = useQuery({ queryKey: ['donatur'], queryFn: donaturApi.list })
  const { data: programRes } = useQuery({ queryKey: ['program'], queryFn: () => programApi.list(true) })

  const trxList = (trxRes?.data ?? []).filter((t) =>
    t.noTransaksi.toLowerCase().includes(search.toLowerCase()) ||
    (t.donatur?.nama ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: transaksiApi.create,
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: ['transaksi'] })
        setOpen(false); setForm(emptyForm); setFormError('')
      } else setFormError(r.message)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => transaksiApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transaksi'] }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.donaturId) { setFormError('Pilih donatur'); return }
    if (!form.programId) { setFormError('Pilih program'); return }
    if (!form.jumlah || form.jumlah <= 0) { setFormError('Jumlah harus lebih dari 0'); return }
    if (form.jenis === 'barang' && !form.deskripsiBarang?.trim()) {
      setFormError('Deskripsi barang wajib diisi'); return
    }
    setFormError('')
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Transaksi Wakaf</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{trxRes?.data?.length ?? 0} transaksi tercatat</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Catat Transaksi</Button>
      </div>

      {/* Search */}
      <Input
        placeholder="🔍  Cari no. transaksi atau nama donatur..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : trxList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">💳</span>
            <p className="text-sm text-muted-foreground">Belum ada transaksi tercatat</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['No. Transaksi', 'Donatur', 'Program', 'Jumlah', 'Jenis', 'Status', 'Aksi'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {trxList.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.noTransaksi}</TableCell>
                  <TableCell className="font-medium">{t.donatur?.nama ?? '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.program?.namaProgram ?? '-'}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    Rp {Number(t.jumlah).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="capitalize text-xs text-muted-foreground">{t.jenis}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[t.status] ?? 'outline'}>{t.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {t.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: t.id, status: 'terverifikasi' })}
                      >
                        Verifikasi
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog Form */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setForm(emptyForm); setFormError('') } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Catat Transaksi Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Donatur */}
              <div className="space-y-1.5">
                <Label>Donatur <span className="text-destructive">*</span></Label>
                <Select
                  value={form.donaturId ? String(form.donaturId) : ''}
                  onValueChange={(v) => setForm({ ...form, donaturId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih donatur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {donaturRes?.data?.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Program */}
              <div className="space-y-1.5">
                <Label>Program <span className="text-destructive">*</span></Label>
                <Select
                  value={form.programId ? String(form.programId) : ''}
                  onValueChange={(v) => setForm({ ...form, programId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih program..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programRes?.data?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.namaProgram}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Jenis */}
              <div className="space-y-1.5">
                <Label>Jenis Wakaf <span className="text-destructive">*</span></Label>
                <Select
                  value={form.jenis}
                  onValueChange={(v) => setForm({ ...form, jenis: v as 'uang' | 'barang', deskripsiBarang: undefined })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uang">Uang</SelectItem>
                    <SelectItem value="barang">Barang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Jumlah */}
              <div className="space-y-1.5">
                <Label>Jumlah (Rp) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  value={form.jumlah || ''}
                  onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })}
                  placeholder="500000"
                />
                {form.jumlah > 0 && (
                  <p className="text-xs text-ring italic">≈ Rp {form.jumlah.toLocaleString('id-ID')}</p>
                )}
              </div>
            </div>

            {form.jenis === 'barang' && (
              <div className="space-y-1.5">
                <Label>Deskripsi Barang <span className="text-destructive">*</span></Label>
                <Input
                  value={form.deskripsiBarang ?? ''}
                  onChange={(e) => setForm({ ...form, deskripsiBarang: e.target.value })}
                  placeholder="Contoh: Al-Quran 30 juz"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Metode Pembayaran</Label>
                <Input
                  value={form.metodePembayaran ?? ''}
                  onChange={(e) => setForm({ ...form, metodePembayaran: e.target.value })}
                  placeholder="Transfer, Tunai..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Catatan</Label>
                <Input
                  value={form.catatan ?? ''}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs py-2 px-3 rounded-md bg-destructive/10 text-destructive">{formError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setForm(emptyForm); setFormError('') }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
