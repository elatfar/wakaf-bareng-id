import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Users, Pencil, Trash2 } from 'lucide-react'
import { donaturApi } from '@/lib/api'
import type { Donatur, BuatDonaturInput } from 'shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import Pagination from '@/components/Pagination'

const MAROON = '#2B0F17'
const GOLD = '#B8863F'
const GOLD_SOFT = '#F3E7DC'

const emptyForm: BuatDonaturInput = { nama: '', noHp: '', email: '', alamat: '', nik: '' }

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

function Avatar({ nama }: { nama: string }) {
  const initial = nama.trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
    >
      {initial}
    </div>
  )
}

export default function DonaturPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Donatur | null>(null)
  const [form, setForm] = useState<BuatDonaturInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data: res, isLoading } = useQuery({
    queryKey: ['donatur', page, limit, search],
    queryFn: () => donaturApi.list({ page, limit, search: search || undefined }),
  })

  const donaturList = res?.data?.data ?? []
  const pagination = res?.data?.pagination

  const createMutation = useMutation({
    mutationFn: donaturApi.create,
    onSuccess: (r) => {
      if (r.success) { qc.invalidateQueries({ queryKey: ['donatur'] }); closeDialog() }
      else setFormError(r.message ?? 'Gagal menyimpan')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<BuatDonaturInput> }) => donaturApi.update(id, body),
    onSuccess: (r) => {
      if (r.success) { qc.invalidateQueries({ queryKey: ['donatur'] }); closeDialog() }
      else setFormError(r.message ?? 'Gagal menyimpan')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: donaturApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donatur'] }),
  })

  function openCreate() { setEditTarget(null); setForm(emptyForm); setFormError(''); setOpen(true) }
  function openEdit(d: Donatur) {
    setEditTarget(d)
    setForm({ nama: d.nama, noHp: d.noHp ?? '', email: d.email ?? '', alamat: d.alamat ?? '', nik: d.nik ?? '' })
    setFormError('')
    setOpen(true)
  }
  function closeDialog() { setOpen(false); setFormError('') }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nama.trim()) { setFormError('Nama wajib diisi'); return }
    setFormError('')
    editTarget
      ? updateMutation.mutate({ id: editTarget.id, body: form })
      : createMutation.mutate(form)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: MAROON }}>Donatur</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pagination?.total ?? 0} donatur terdaftar</p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-1.5 text-white hover:opacity-90"
          style={{ backgroundColor: MAROON }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Tambah Donatur
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama, HP, atau email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : donaturList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
            >
              <Users className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm text-muted-foreground">
              {search ? 'Donatur tidak ditemukan' : 'Belum ada donatur. Tambahkan donatur pertama.'}
            </p>
          </div>
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Nama</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">No. HP</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">NIK</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donaturList.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="truncate">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar nama={d.nama} />
                      <span className="truncate font-medium">{d.nama}</span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate text-muted-foreground">{d.noHp ?? '-'}</TableCell>
                  <TableCell className="truncate text-muted-foreground">{d.email ?? '-'}</TableCell>
                  <TableCell>
                    {d.nik ? (
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-xs"
                        style={{ backgroundColor: GOLD_SOFT, color: MAROON }}
                      >
                        {d.nik}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(d)}>
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1.5"
                        disabled={deleteMutation.isPending}
                        onClick={() => { if (confirm(`Hapus ${d.nama}?`)) deleteMutation.mutate(d.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Donatur' : 'Tambah Donatur Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <FormField label="Nama Lengkap" required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="No. HP" type="tel" value={form.noHp ?? ''} onChange={(e) => setForm({ ...form, noHp: e.target.value })} />
              <FormField label="Email" type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <FormField label="Alamat" value={form.alamat ?? ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
            <FormField label="NIK" value={form.nik ?? ''} onChange={(e) => setForm({ ...form, nik: e.target.value })} placeholder="16 digit NIK" />
            {formError && (
              <p className="text-xs py-2 px-3 rounded-md bg-destructive/10 text-destructive">{formError}</p>
            )}
            <div className="flex gap-3 pt-2">
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