import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { programApi } from '@/lib/api'
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
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

const MAROON = '#2B0F17'
const GOLD = '#B8863F'
const GOLD_SOFT = '#F3E7DC'

const emptyForm: BuatProgramInput = { namaProgram: '', deskripsi: '' }

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

export default function ProgramPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Program | null>(null)
  const [form, setForm] = useState<BuatProgramInput>(emptyForm)
  const [formError, setFormError] = useState('')

  const { data: res, isLoading } = useQuery({
    queryKey: ['program'],
    queryFn: () => programApi.list(),
  })

  const programList = res?.data ?? []
  const aktifCount = programList.filter((p) => p.aktif).length

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
    setForm({ namaProgram: p.namaProgram, deskripsi: p.deskripsi ?? '' })
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
        <Button
          id="btn-tambah-program"
          onClick={openCreate}
          className="gap-1.5 text-white hover:opacity-90"
          style={{ backgroundColor: MAROON }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Tambah Program
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : programList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
            >
              <FolderOpen className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm text-muted-foreground">
              Belum ada program. Tambahkan program wakaf pertama.
            </p>
          </div>
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[35%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Nama Program</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Deskripsi</TableHead>
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
                      <span className="truncate font-medium">{p.namaProgram}</span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate text-muted-foreground text-sm">
                    {p.deskripsi ?? <span className="italic">—</span>}
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
                        id={`btn-edit-program-${p.id}`}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Edit
                      </Button>
                      <Button
                        id={`btn-toggle-aktif-${p.id}`}
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
                        {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="max-w-md">
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
            {formError && (
              <p className="text-xs py-2 px-3 rounded-md bg-destructive/10 text-destructive">{formError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                id="btn-submit-program"
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
