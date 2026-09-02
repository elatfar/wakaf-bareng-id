import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transaksiApi, donaturApi, programApi } from '@/lib/api'
import type { BuatTransaksiInput, TipeDana } from 'shared'
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
import Pagination from '@/components/Pagination'

const MAROON = '#2B0F17'
const GOLD = '#B8863F'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  terverifikasi: 'default',
  pending: 'secondary',
  batal: 'destructive',
}

function todayString() {
  return new Date().toISOString().split('T')[0] as string
}

const emptyForm = (defaultTipe: TipeDana = 'wakaf'): BuatTransaksiInput & { tipeTransaksi?: TipeDana } => ({
  donaturId: 0,
  programId: 0,
  jenis: 'uang',
  jumlah: 0,
  metodePembayaran: '',
  catatan: '',
  tanggal: todayString(),
  tipeTransaksi: defaultTipe,
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
    setQuickNama(search)
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
  const [selectedTipe, setSelectedTipe] = useState<TipeDana>('wakaf')
  const [tipeTab, setTipeTab] = useState<'semua' | 'wakaf' | 'zakat'>('semua')
  const [form, setForm] = useState<BuatTransaksiInput & { tipeTransaksi?: TipeDana }>(emptyForm('wakaf'))
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data: trxRes, isLoading } = useQuery({
    queryKey: ['transaksi', { tipe: tipeTab !== 'semua' ? tipeTab : undefined, page, limit }],
    queryFn: () => transaksiApi.list({ tipe: tipeTab !== 'semua' ? tipeTab : undefined, page, limit }),
  })

  // List all for count badges
  const { data: allTrxRes } = useQuery({
    queryKey: ['transaksi', 'all-counts'],
    queryFn: () => transaksiApi.list(),
  })

  const { data: donaturRes } = useQuery({ queryKey: ['donatur'], queryFn: () => donaturApi.list() })
  const { data: programRes } = useQuery({ queryKey: ['program'], queryFn: () => programApi.list({ aktif: true }) })

  const allTrx = allTrxRes?.data?.data ?? []
  const countSemua = allTrx.length
  const countWakaf = allTrx.filter(t => (t as any).tipe === 'wakaf' || t.program?.tipe === 'wakaf').length
  const countZakat = allTrx.filter(t => (t as any).tipe === 'zakat' || t.program?.tipe === 'zakat').length

  const trxList = (trxRes?.data?.data ?? []).filter((t) =>
    t.noTransaksi.toLowerCase().includes(search.toLowerCase()) ||
    (t.donatur?.nama ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (t.program?.namaProgram ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const pagination = trxRes?.data?.pagination

  const createTransaksiMutation = useMutation({
    mutationFn: transaksiApi.create,
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: ['transaksi'] })
        setOpen(false)
        setForm(emptyForm(selectedTipe))
        setFormError('')
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

  function handleOpenModal(defaultTipe?: TipeDana) {
    const tipeToSet = defaultTipe ?? (tipeTab !== 'semua' ? tipeTab : 'wakaf')
    setSelectedTipe(tipeToSet)
    setForm(emptyForm(tipeToSet))
    setFormError('')
    setOpen(true)
  }

  function handleSwitchTipe(newTipe: TipeDana) {
    setSelectedTipe(newTipe)
    setForm((prev) => ({
      ...prev,
      programId: 0, // Reset selected program when switching tipe
      tipeTransaksi: newTipe,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.donaturId) { setFormError('Pilih atau tambah donatur terlebih dahulu'); return }
    if (!form.programId) { setFormError(`Pilih program ${selectedTipe === 'zakat' ? 'zakat' : 'wakaf'}`); return }
    if (!form.jumlah || form.jumlah <= 0) { setFormError('Jumlah harus lebih dari 0'); return }
    if (form.jenis === 'barang' && !form.deskripsiBarang?.trim()) {
      setFormError(`Deskripsi barang wajib diisi untuk ${selectedTipe === 'zakat' ? 'zakat' : 'wakaf'} barang`); return
    }
    setFormError('')
    const { tipeTransaksi, ...payload } = form
    createTransaksiMutation.mutate(payload)
  }

  const donaturList = donaturRes?.data?.data?.map((d) => ({ id: d.id, nama: d.nama, noHp: d.noHp ?? null })) ?? []
  
  // Filter active programs based on selected tipe in dialog
  const activeProgramsForSelectedTipe = (programRes?.data?.data ?? []).filter((p) => p.tipe === selectedTipe)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: MAROON }}>Transaksi Wakaf & Zakat</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{trxRes?.data?.data?.length ?? 0} transaksi ditampilkan</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="text-white hover:opacity-90 gap-1.5"
          style={{ backgroundColor: MAROON }}
        >
          + Catat Transaksi
        </Button>
      </div>

      {/* Tabs Tipe Transaksi */}
      <div className="flex border-b border-border/80 gap-2">
        <button
          type="button"
          onClick={() => { setTipeTab('semua'); setPage(1) }}
          className="pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors"
          style={{
            borderColor: tipeTab === 'semua' ? MAROON : 'transparent',
            color: tipeTab === 'semua' ? MAROON : 'var(--muted-foreground)',
          }}
        >
          Semua Transaksi ({countSemua})
        </button>
        <button
          type="button"
          onClick={() => { setTipeTab('wakaf'); setPage(1) }}
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
          onClick={() => { setTipeTab('zakat'); setPage(1) }}
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

      {/* Search */}
      <Input
        placeholder="🔍  Cari no. transaksi, nama donatur, atau program..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
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
            <p className="text-sm text-muted-foreground mb-2">
              {search ? 'Tidak ada transaksi yang cocok dengan pencarian' : 'Belum ada transaksi tercatat'}
            </p>
            <Button
              size="sm"
              onClick={() => handleOpenModal(tipeTab !== 'semua' ? tipeTab : undefined)}
              style={{ backgroundColor: MAROON, color: '#fff' }}
            >
              + Catat Transaksi {tipeTab !== 'semua' ? (tipeTab === 'zakat' ? 'Zakat' : 'Wakaf') : ''}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['No. Transaksi', 'Tipe', 'Donatur', 'Program', 'Jumlah', 'Jenis', 'Tanggal', 'Status', 'Aksi'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {trxList.map((t) => {
                const itemTipe = (t as any).tipe ?? t.program?.tipe ?? 'wakaf'
                const isZakat = itemTipe === 'zakat'
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.noTransaksi}</TableCell>
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
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Dialog Form */}
      <Dialog open={open} onOpenChange={(o) => {
        if (!o) { setOpen(false); setForm(emptyForm(selectedTipe)); setFormError('') }
      }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Catat Transaksi Baru ({selectedTipe === 'zakat' ? 'Zakat' : 'Wakaf'})
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">

            {/* Pilihan Tipe Transaksi: Wakaf vs Zakat */}
            <div className="space-y-1.5">
              <Label>Tipe Transaksi <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchTipe('wakaf')}
                  className="flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition-all"
                  style={{
                    borderColor: selectedTipe === 'wakaf' ? MAROON : 'var(--border)',
                    backgroundColor: selectedTipe === 'wakaf' ? MAROON : 'transparent',
                    color: selectedTipe === 'wakaf' ? '#fff' : 'var(--foreground)',
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedTipe === 'wakaf' ? '#fff' : GOLD }} />
                  Wakaf
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTipe('zakat')}
                  className="flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition-all"
                  style={{
                    borderColor: selectedTipe === 'zakat' ? '#047857' : 'var(--border)',
                    backgroundColor: selectedTipe === 'zakat' ? '#047857' : 'transparent',
                    color: selectedTipe === 'zakat' ? '#fff' : 'var(--foreground)',
                  }}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Zakat
                </button>
              </div>
            </div>

            {/* Donatur — full width with combobox */}
            <div className="space-y-1.5">
              <Label>
                Donatur / Muzakki <span className="text-destructive">*</span>
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

            {/* Program — difilter sesuai tipe yang dipilih */}
            <div className="space-y-1.5">
              <Label>
                Program {selectedTipe === 'zakat' ? 'Zakat' : 'Wakaf'} <span className="text-destructive">*</span>
              </Label>
              {activeProgramsForSelectedTipe.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground bg-muted/30">
                  Belum ada program {selectedTipe === 'zakat' ? 'zakat' : 'wakaf'} aktif. Silakan tambahkan program terlebih dahulu di menu <strong>Program</strong>.
                </div>
              ) : (
                <Select
                  value={form.programId ? String(form.programId) : ''}
                  onValueChange={(v) => setForm({ ...form, programId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Pilih program ${selectedTipe === 'zakat' ? 'zakat (cth. Zakat Fitrah, Zakat Penghasilan)' : 'wakaf'}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProgramsForSelectedTipe.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.namaProgram}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Jenis */}
              <div className="space-y-1.5">
                <Label>Jenis {selectedTipe === 'zakat' ? 'Zakat' : 'Wakaf'} <span className="text-destructive">*</span></Label>
                <Select
                  value={form.jenis}
                  onValueChange={(v) => setForm({ ...form, jenis: v as 'uang' | 'barang', deskripsiBarang: undefined })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uang">Uang (Tunai/Transfer)</SelectItem>
                    <SelectItem value="barang">{selectedTipe === 'zakat' ? 'Barang / Beras' : 'Barang'}</SelectItem>
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
              <Label>Nominal {selectedTipe === 'zakat' ? 'Zakat' : 'Wakaf'} (Rp) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                value={form.jumlah || ''}
                onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })}
                placeholder="500000"
              />
              {form.jumlah > 0 && (
                <p className="text-xs italic font-medium" style={{ color: selectedTipe === 'zakat' ? '#047857' : GOLD }}>
                  ≈ Rp {form.jumlah.toLocaleString('id-ID')}
                </p>
              )}
            </div>

            {/* Deskripsi barang — conditional */}
            {form.jenis === 'barang' && (
              <div className="space-y-1.5">
                <Label>
                  Deskripsi {selectedTipe === 'zakat' ? 'Barang / Beras Zakat' : 'Barang Wakaf'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.deskripsiBarang ?? ''}
                  onChange={(e) => setForm({ ...form, deskripsiBarang: e.target.value })}
                  placeholder={selectedTipe === 'zakat' ? 'Contoh: Beras Premium 5 kg' : 'Contoh: Al-Quran 30 juz'}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Metode Pembayaran</Label>
                <Input
                  value={form.metodePembayaran ?? ''}
                  onChange={(e) => setForm({ ...form, metodePembayaran: e.target.value })}
                  placeholder="Transfer Bank, QRIS, Tunai..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Catatan</Label>
                <Input
                  value={form.catatan ?? ''}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  placeholder="Opsional..."
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs py-2 px-3 rounded-md bg-destructive/10 text-destructive">{formError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={createTransaksiMutation.isPending || activeProgramsForSelectedTipe.length === 0}
                className="flex-1 text-white hover:opacity-90"
                style={{ backgroundColor: selectedTipe === 'zakat' ? '#047857' : MAROON }}
              >
                {createTransaksiMutation.isPending ? 'Menyimpan...' : `Simpan Transaksi ${selectedTipe === 'zakat' ? 'Zakat' : 'Wakaf'}`}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setForm(emptyForm(selectedTipe)); setFormError('') }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
