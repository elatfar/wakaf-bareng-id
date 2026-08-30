import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transaksiApi, donaturApi, programApi } from '@/lib/api'
import type { BuatTransaksiInput } from 'shared'
import { cn } from '@/lib/utils'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { CheckIcon, ChevronsUpDownIcon, UserPlusIcon } from 'lucide-react'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  terverifikasi: 'default',
  pending: 'secondary',
  batal: 'destructive',
}

function todayString() {
  return new Date().toISOString().split('T')[0] as string
}

const emptyForm = (): BuatTransaksiInput => ({
  donaturId: 0,
  programId: 0,
  jenis: 'uang',
  jumlah: 0,
  metodePembayaran: '',
  catatan: '',
  tanggal: todayString(),
})

// ─── Donatur Combobox with Quick-Create ──────────────────────────────────────

interface DonaturComboboxProps {
  donaturList: { id: number; nama: string; noHp: string | null }[]
  value: number
  onChange: (id: number) => void
  onQuickCreate: (nama: string, noHp: string) => Promise<number>
  isCreating: boolean
}

function DonaturCombobox({ donaturList, value, onChange, onQuickCreate, isCreating }: DonaturComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [quickNama, setQuickNama] = useState('')
  const [quickNoHp, setQuickNoHp] = useState('')

  const selectedNama = donaturList.find((d) => d.id === value)?.nama

  const filtered = donaturList.filter((d) =>
    d.nama.toLowerCase().includes(search.toLowerCase()) ||
    (d.noHp ?? '').includes(search)
  )

  const exactMatch = donaturList.some((d) => d.nama.toLowerCase() === search.toLowerCase())

  async function handleQuickCreate() {
    if (!quickNama.trim()) return
    const newId = await onQuickCreate(quickNama.trim(), quickNoHp.trim())
    onChange(newId)
    setOpen(false)
    setSearch('')
    setShowQuickForm(false)
    setQuickNama('')
    setQuickNoHp('')
  }

  function handleOpenQuickForm() {
    setQuickNama(search) // pre-fill dengan teks yang sudah diketik
    setShowQuickForm(true)
  }

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o)
      if (!o) { setShowQuickForm(false); setSearch('') }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedNama ?? <span className="text-muted-foreground">Pilih atau tambah donatur...</span>}
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {!showQuickForm ? (
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Cari nama atau HP..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandGroup>
                {filtered.length === 0 && search && (
                  <CommandEmpty>
                    Donatur &quot;{search}&quot; tidak ditemukan.
                  </CommandEmpty>
                )}
                {filtered.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={String(d.id)}
                    onSelect={() => {
                      onChange(d.id)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <CheckIcon className={cn('mr-2 size-4', value === d.id ? 'opacity-100' : 'opacity-0')} />
                    <div>
                      <p className="font-medium text-sm">{d.nama}</p>
                      {d.noHp && <p className="text-xs text-muted-foreground">{d.noHp}</p>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              {/* Quick Create option — tampil jika ada teks search dan belum exact match */}
              {search.trim() && !exactMatch && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={handleOpenQuickForm} className="text-primary">
                      <UserPlusIcon className="mr-2 size-4" />
                      Tambah &quot;{search}&quot; sebagai donatur baru
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        ) : (
          // Quick Create mini-form
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b">
              <UserPlusIcon className="size-4 text-primary" />
              <span className="text-sm font-medium text-primary">Donatur Baru</span>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Nama <span className="text-destructive">*</span></Label>
                <Input
                  autoFocus
                  value={quickNama}
                  onChange={(e) => setQuickNama(e.target.value)}
                  placeholder="Nama lengkap"
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleQuickCreate() } }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">No. HP <span className="text-muted-foreground">(opsional)</span></Label>
                <Input
                  value={quickNoHp}
                  onChange={(e) => setQuickNoHp(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleQuickCreate() } }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-8"
                disabled={!quickNama.trim() || isCreating}
                onClick={() => void handleQuickCreate()}
              >
                {isCreating ? 'Menyimpan...' : 'Simpan & Pilih'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setShowQuickForm(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransaksiPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BuatTransaksiInput>(emptyForm())
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const { data: trxRes, isLoading } = useQuery({ queryKey: ['transaksi'], queryFn: transaksiApi.list })
  const { data: donaturRes } = useQuery({ queryKey: ['donatur'], queryFn: donaturApi.list })
  const { data: programRes } = useQuery({ queryKey: ['program'], queryFn: () => programApi.list(true) })

  const trxList = (trxRes?.data ?? []).filter((t) =>
    t.noTransaksi.toLowerCase().includes(search.toLowerCase()) ||
    (t.donatur?.nama ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const createTransaksiMutation = useMutation({
    mutationFn: transaksiApi.create,
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: ['transaksi'] })
        setOpen(false); setForm(emptyForm()); setFormError('')
      } else setFormError(r.message ?? 'Terjadi kesalahan')
    },
  })

  // Quick-create donatur inline
  const createDonaturMutation = useMutation({
    mutationFn: donaturApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donatur'] }),
  })

  async function handleQuickCreateDonatur(nama: string, noHp: string): Promise<number> {
    const res = await createDonaturMutation.mutateAsync({ nama, noHp: noHp || undefined })
    if (res.success && res.data) {
      return res.data.id
    }
    throw new Error(res.message ?? 'Gagal membuat donatur')
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => transaksiApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transaksi'] }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.donaturId) { setFormError('Pilih atau tambah donatur terlebih dahulu'); return }
    if (!form.programId) { setFormError('Pilih program'); return }
    if (!form.jumlah || form.jumlah <= 0) { setFormError('Jumlah harus lebih dari 0'); return }
    if (form.jenis === 'barang' && !form.deskripsiBarang?.trim()) {
      setFormError('Deskripsi barang wajib diisi'); return
    }
    setFormError('')
    createTransaksiMutation.mutate(form)
  }

  const donaturList = donaturRes?.data?.map((d) => ({ id: d.id, nama: d.nama, noHp: d.noHp ?? null })) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Transaksi Wakaf</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{trxRes?.data?.length ?? 0} transaksi tercatat</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setOpen(true) }}>+ Catat Transaksi</Button>
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
                {['No. Transaksi', 'Donatur', 'Program', 'Jumlah', 'Jenis', 'Tanggal', 'Status', 'Aksi'].map((h) => (
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
                  <TableCell className="text-xs text-muted-foreground">{t.tanggal ?? '-'}</TableCell>
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
      <Dialog open={open} onOpenChange={(o) => {
        if (!o) { setOpen(false); setForm(emptyForm()); setFormError('') }
      }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catat Transaksi Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">

            {/* Donatur — full width with combobox */}
            <div className="space-y-1.5">
              <Label>
                Donatur <span className="text-destructive">*</span>
                {form.donaturId === 0 && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    — ketik untuk cari atau tambah baru
                  </span>
                )}
              </Label>
              <DonaturCombobox
                donaturList={donaturList}
                value={form.donaturId}
                onChange={(id) => setForm({ ...form, donaturId: id })}
                onQuickCreate={handleQuickCreateDonatur}
                isCreating={createDonaturMutation.isPending}
              />
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

            <div className="grid grid-cols-2 gap-4">
              {/* Jenis */}
              <div className="space-y-1.5">
                <Label>Jenis Wakaf <span className="text-destructive">*</span></Label>
                <Select
                  value={form.jenis}
                  onValueChange={(v) => setForm({ ...form, jenis: v as 'uang' | 'barang', deskripsiBarang: undefined })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uang">Uang</SelectItem>
                    <SelectItem value="barang">Barang</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tanggal */}
              <div className="space-y-1.5">
                <Label>Tanggal Transaksi <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.tanggal ?? todayString()}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  max={todayString()}
                />
              </div>
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

            {/* Deskripsi barang — conditional */}
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
              <Button type="submit" disabled={createTransaksiMutation.isPending} className="flex-1">
                {createTransaksiMutation.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setForm(emptyForm()); setFormError('') }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
