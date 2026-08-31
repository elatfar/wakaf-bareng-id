import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Pencil, ToggleLeft, ToggleRight, Grid, List, Search, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import { programApi, transaksiApi } from '@/lib/api'
import type { Program, BuatProgramInput } from 'shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MAROON = '#2B0F17'
const GOLD = '#B8863F'
const GOLD_SOFT = '#F3E7DC'

const emptyForm: BuatProgramInput = { namaProgram: '', deskripsi: '' }

const KATEGORI_OPTIONS = [
  { value: 'pendidikan', label: 'Pendidikan' },
  { value: 'kesehatan', label: 'Kesehatan' },
  { value: 'sosial', label: 'Sosial' },
  { value: 'infrastruktur', label: 'Infrastruktur' },
  { value: 'dakwah', label: 'Dakwah' },
  { value: 'lainnya', label: 'Lainnya' },
]

function FormField({
  label,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  const id = String(props.id ?? label.toLowerCase().replace(/\s/g, '-'))
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input id={id} {...props} />
    </div>
  )
}

function ProgramCard({ program, onEdit, onToggle, stats }: { 
  program: Program; 
  onEdit: (p: Program) => void; 
  onToggle: (p: Program) => void;
  stats?: { totalTerkumpul: number; progress: number; target: number | null };
}) {
  const cardProgress = stats?.progress ?? 0
  const cardTotalTerkumpul = stats?.totalTerkumpul ?? 0
  const cardTarget = stats?.target ?? null
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#10b981' // green
    if (progress >= 50) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const isNearTarget = cardTarget && cardProgress >= 80 && cardProgress < 100
  const isCompleted = cardProgress >= 100

  const priorityColor = program.prioritas >= 4 ? '#ef4444' : program.prioritas >= 2 ? '#f59e0b' : GOLD

  return (
    <Card 
      className="overflow-hidden transition-shadow hover:shadow-md" 
      style={{
        borderColor: program.prioritas > 0 ? priorityColor : (program.aktif ? GOLD : undefined),
        borderWidth: program.prioritas > 0 ? 2 : (program.aktif ? 2 : 1),
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
              >
                {program.namaProgram.charAt(0).toUpperCase()}
              </div>
              {program.prioritas > 0 && (
                <div 
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: program.prioritas >= 4 ? '#ef4444' : program.prioritas >= 2 ? '#f59e0b' : GOLD }}
                >
                  {program.prioritas}
                </div>
              )}
            </div>
            <div>
              <span className="font-semibold truncate block">{program.namaProgram}</span>
              {program.kategori && (
                <Badge variant="outline" className="text-[10px] mt-0.5">
                  {KATEGORI_OPTIONS.find(k => k.value === program.kategori)?.label || program.kategori}
                </Badge>
              )}
            </div>
          </div>
          {program.aktif && (
            <Badge
              className="text-xs font-medium shrink-0"
              style={{ backgroundColor: GOLD, color: '#fff', border: 'none' }}
            >
              ★ Aktif
            </Badge>
          )}
        </div>

        {program.deskripsi && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{program.deskripsi}</p>
        )}

        {cardTarget ? (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold" style={{ color: getProgressColor(cardProgress) }}>
                {cardProgress.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: GOLD_SOFT }}>
              <div 
                className="h-2 rounded-full transition-all duration-500" 
                style={{ 
                  backgroundColor: getProgressColor(cardProgress),
                  width: `${cardProgress}%` 
                }} 
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Rp {cardTotalTerkumpul.toLocaleString('id-ID')}</span>
              <span>Rp {cardTarget.toLocaleString('id-ID')}</span>
            </div>
            {isNearTarget && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-600 mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>Hampir mencapai target!</span>
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center gap-1.5 text-[10px] text-green-600 mt-1">
                <AlertCircle className="h-3 w-3" />
                <span>Target tercapai! 🎉</span>
              </div>
            )}
            {cardProgress >= 50 && cardProgress < 80 && (
              <div className="flex items-center gap-1.5 text-[10px] text-blue-600 mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>Progress baik!</span>
              </div>
            )}
          </div>
        ) : program.targetDana ? (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Target Dana</span>
              <span className="font-semibold" style={{ color: GOLD }}>
                Rp {Number(program.targetDana).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ backgroundColor: GOLD_SOFT }}>
              <div className="h-1.5 rounded-full w-1/3" style={{ backgroundColor: GOLD }} />
            </div>
          </div>
        ) : null}

        {program.tanggalMulai && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Calendar className="h-3 w-3" />
            <span>{new Date(program.tanggalMulai).toLocaleDateString('id-ID')}</span>
            {program.tanggalSelesai && (
              <>
                <span>—</span>
                <span>{new Date(program.tanggalSelesai).toLocaleDateString('id-ID')}</span>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 flex-1"
            onClick={() => onEdit(program)}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onToggle(program)}
            title={program.aktif ? 'Nonaktifkan program' : 'Aktifkan program'}
          >
            {program.aktif
              ? <ToggleRight className="h-3.5 w-3.5 text-green-600" strokeWidth={1.75} />
              : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProgramPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Program | null>(null)
  const [form, setForm] = useState<BuatProgramInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState<string>('')
  const [aktifFilter, setAktifFilter] = useState<string>('')

  const { data: res, isLoading } = useQuery({
    queryKey: ['program', { search: searchQuery, kategori: kategoriFilter, aktif: aktifFilter ? aktifFilter === 'true' : undefined }],
    queryFn: () => programApi.list({ 
      search: searchQuery || undefined, 
      kategori: kategoriFilter || undefined,
      aktif: aktifFilter ? aktifFilter === 'true' : undefined 
    }),
  })

  const { data: trxRes } = useQuery({
    queryKey: ['transaksi'],
    queryFn: transaksiApi.list,
  })

  const programList = res?.data ?? []
  const aktifCount = programList.filter((p) => p.aktif).length
  
  // Calculate progress for each program
  const programStats = programList.reduce((acc, program) => {
    const programTrx = trxRes?.data?.filter(t => t.programId === program.id && t.status === 'terverifikasi') ?? []
    const totalTerkumpul = programTrx.reduce((sum, t) => sum + Number(t.jumlah), 0)
    const target = program.targetDana ? Number(program.targetDana) : null
    const progress = target && target > 0 ? Math.min(100, (totalTerkumpul / target) * 100) : 0
    
    acc[program.id] = {
      totalTerkumpul,
      progress,
      target,
    }
    return acc
  }, {} as Record<number, { totalTerkumpul: number; progress: number; target: number | null }>)

  const createMutation = useMutation({
    mutationFn: programApi.create,
    onSuccess: (r) => {
      if (r.success) { qc.invalidateQueries({ queryKey: ['program'] }); closeDialog() }
      else setFormError(r.message ?? 'Gagal menyimpan')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<BuatProgramInput> }) =>
      programApi.update(id, body),
    onSuccess: (r) => {
      if (r.success) { qc.invalidateQueries({ queryKey: ['program'] }); closeDialog() }
      else setFormError(r.message ?? 'Gagal menyimpan')
    },
  })

  const toggleAktifMutation = useMutation({
    mutationFn: ({ id, aktif }: { id: number; aktif: boolean }) =>
      programApi.setAktif(id, aktif),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program'] }),
  })

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm)
    setFormError('')
    setOpen(true)
  }

  function openEdit(p: Program) {
    setEditTarget(p)
    setForm({ 
      namaProgram: p.namaProgram, 
      deskripsi: p.deskripsi ?? '',
      targetDana: p.targetDana ?? undefined,
      tanggalMulai: p.tanggalMulai ?? undefined,
      tanggalSelesai: p.tanggalSelesai ?? undefined,
      kategori: p.kategori ?? undefined,
      prioritas: p.prioritas ?? undefined,
    })
    setFormError('')
    setOpen(true)
  }

  function closeDialog() { setOpen(false); setFormError('') }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.namaProgram.trim()) { setFormError('Nama program wajib diisi'); return }
    setFormError('')
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: MAROON }}>Program Wakaf</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {programList.length} program &bull; {aktifCount} aktif
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['program'] })
            }}
            className="gap-1.5"
          >
            <TrendingUp className="h-4 w-4" strokeWidth={2} />
            Refresh
          </Button>
          <Button
            onClick={openCreate}
            className="gap-1.5 text-white hover:opacity-90"
            style={{ backgroundColor: MAROON }}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Tambah Program
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Kategori Filter */}
          <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Kategori</SelectItem>
              {KATEGORI_OPTIONS.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={aktifFilter} onValueChange={setAktifFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Status</SelectItem>
              <SelectItem value="true">Aktif</SelectItem>
              <SelectItem value="false">Nonaktif</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none border-r-0"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('card')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : programList.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
          >
            <FolderOpen className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {searchQuery || kategoriFilter || aktifFilter 
              ? 'Tidak ada program yang sesuai dengan filter.' 
              : 'Belum ada program. Tambahkan program wakaf pertama.'}
          </p>
          {(searchQuery || kategoriFilter || aktifFilter) && (
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setKategoriFilter(''); setAktifFilter('') }}>
              Reset Filter
            </Button>
          )}
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[20%]" />
              <col className="w-[15%]" />
              <col className="w-[10%]" />
              <col className="w-[20%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Nama Program</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Kategori</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Target Dana</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programList.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
                      >
                        {p.namaProgram.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="truncate font-medium block">{p.namaProgram}</span>
                        {p.deskripsi && <span className="text-xs text-muted-foreground truncate block">{p.deskripsi}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.kategori ? (
                      <Badge variant="outline" className="text-xs">
                        {KATEGORI_OPTIONS.find(k => k.value === p.kategori)?.label || p.kategori}
                      </Badge>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    {p.targetDana ? (
                      <div className="space-y-1">
                        <span className="font-semibold text-sm block" style={{ color: GOLD }}>
                          Rp {Number(p.targetDana).toLocaleString('id-ID')}
                        </span>
                        {programStats[p.id]?.target && (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full flex-1" style={{ backgroundColor: GOLD_SOFT }}>
                              <div 
                                className="h-1.5 rounded-full" 
                                style={{ 
                                  backgroundColor: programStats[p.id].progress >= 80 ? '#10b981' : programStats[p.id].progress >= 50 ? '#f59e0b' : '#ef4444',
                                  width: `${programStats[p.id].progress}%` 
                                }} 
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {programStats[p.id].progress.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    {p.aktif ? (
                      <Badge
                        className="text-xs font-medium"
                        style={{ backgroundColor: '#dcfce7', color: '#15803d', border: 'none' }}
                      >
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={toggleAktifMutation.isPending}
                        onClick={() => toggleAktifMutation.mutate({ id: p.id, aktif: !p.aktif })}
                        title={p.aktif ? 'Nonaktifkan program' : 'Aktifkan program'}
                      >
                        {p.aktif
                          ? <ToggleRight className="h-3.5 w-3.5 text-green-600" strokeWidth={1.75} />
                          : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                        }
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programList.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              onEdit={openEdit}
              onToggle={(p) => toggleAktifMutation.mutate({ id: p.id, aktif: !p.aktif })}
              stats={programStats[p.id]}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Program' : 'Tambah Program Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <FormField
              id="namaProgram"
              label="Nama Program"
              required
              value={form.namaProgram}
              onChange={(e) => setForm({ ...form, namaProgram: e.target.value })}
              placeholder="cth. Wakaf Produktif 2026"
            />
            <div className="space-y-1.5">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                rows={3}
                value={form.deskripsi ?? ''}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                placeholder="Opsional — keterangan singkat program"
                className="resize-none"
              />
            </div>
            <FormField
              id="targetDana"
              label="Target Dana (Rp)"
              type="number"
              value={form.targetDana ?? ''}
              onChange={(e) => setForm({ ...form, targetDana: Number(e.target.value) })}
              placeholder="0"
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                id="tanggalMulai"
                label="Tanggal Mulai"
                type="date"
                value={form.tanggalMulai ?? ''}
                onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })}
              />
              <FormField
                id="tanggalSelesai"
                label="Tanggal Selesai"
                type="date"
                value={form.tanggalSelesai ?? ''}
                onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kategori">Kategori</Label>
              <Select value={form.kategori ?? ''} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tanpa Kategori</SelectItem>
                  {KATEGORI_OPTIONS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormField
              id="prioritas"
              label="Prioritas (1-5)"
              type="number"
              min="1"
              max="5"
              value={form.prioritas ?? 0}
              onChange={(e) => setForm({ ...form, prioritas: Number(e.target.value) })}
              placeholder="0"
            />
            {formError && (
              <p className="text-xs py-2 px-3 rounded-md bg-destructive/10 text-destructive">{formError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 text-white hover:opacity-90"
                style={{ backgroundColor: MAROON }}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
