import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export default function DonaturPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Donatur | null>(null)
  const [form, setForm] = useState<BuatDonaturInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const { data: res, isLoading } = useQuery({ queryKey: ['donatur'], queryFn: donaturApi.list })

  const donaturList = (res?.data ?? []).filter((d) =>
    d.nama.toLowerCase().includes(search.toLowerCase()) ||
    (d.noHp ?? '').includes(search) ||
    (d.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-primary">Donatur</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{res?.data?.length ?? 0} donatur terdaftar</p>
        </div>
        <Button onClick={openCreate}>+ Tambah Donatur</Button>
      </div>

      {/* Search */}
      <Input
        placeholder="🔍  Cari nama, HP, atau email..."
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
        ) : donaturList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">👥</span>
            <p className="text-sm text-muted-foreground">
              {search ? 'Donatur tidak ditemukan' : 'Belum ada donatur. Tambahkan donatur pertama.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['Nama', 'No. HP', 'Email', 'NIK', 'Aksi'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {donaturList.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{d.noHp ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{d.email ?? '-'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{d.nik ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => { if (confirm(`Hapus ${d.nama}?`)) deleteMutation.mutate(d.id) }}
                      >
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
              <Button type="submit" disabled={isSaving} className="flex-1">
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
