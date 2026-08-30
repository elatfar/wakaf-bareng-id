import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { penandatanganApi, penggunaApi } from '@/lib/api'
import type { BuatPenandatanganInput, BuatPenggunaInput } from 'shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default function PengaturanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola penandatangan dan akun pengguna</p>
      </div>

      <Tabs defaultValue="penandatangan">
        <TabsList>
          <TabsTrigger value="penandatangan">✍ Penandatangan</TabsTrigger>
          <TabsTrigger value="pengguna">👤 Pengguna</TabsTrigger>
        </TabsList>
        <TabsContent value="penandatangan" className="mt-4">
          <PenandatanganTab />
        </TabsContent>
        <TabsContent value="pengguna" className="mt-4">
          <PenggunaTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PenandatanganTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BuatPenandatanganInput>({ nama: '', jabatan: '' })
  const [formError, setFormError] = useState('')

  const { data: res } = useQuery({ queryKey: ['penandatangan'], queryFn: penandatanganApi.list })
  const list = res?.data ?? []

  const createMutation = useMutation({
    mutationFn: penandatanganApi.create,
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: ['penandatangan'] })
        setOpen(false); setForm({ nama: '', jabatan: '' }); setFormError('')
      } else setFormError(r.message ?? 'Gagal menyimpan')
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ Tambah Penandatangan</Button>
      </div>

      <Card>
        {list.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <span className="text-4xl mb-2">✍</span>
            <p className="text-sm text-muted-foreground">Belum ada penandatangan</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['Nama', 'Jabatan', 'Status'].map((h) => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{p.jabatan}</TableCell>
                  <TableCell>
                    <Badge variant={p.aktif ? 'default' : 'outline'}>{p.aktif ? 'Aktif' : 'Nonaktif'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setFormError('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Penandatangan</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nama <span className="text-destructive">*</span></Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1.5">
              <Label>Jabatan <span className="text-destructive">*</span></Label>
              <Input value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} placeholder="Ketua Yayasan" />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={createMutation.isPending}
                onClick={() => {
                  if (!form.nama.trim() || !form.jabatan.trim()) { setFormError('Nama dan jabatan wajib diisi'); return }
                  setFormError(''); createMutation.mutate(form)
                }}
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={() => { setOpen(false); setFormError('') }}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PenggunaTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BuatPenggunaInput>({ nama: '', email: '', password: '', role: 'admin' })
  const [formError, setFormError] = useState('')

  const { data: res } = useQuery({ queryKey: ['pengguna'], queryFn: penggunaApi.list })
  const list = res?.data ?? []

  const createMutation = useMutation({
    mutationFn: penggunaApi.create,
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: ['pengguna'] })
        setOpen(false); setForm({ nama: '', email: '', password: '', role: 'admin' }); setFormError('')
      } else setFormError(r.message ?? 'Gagal menyimpan')
    },
  })

  const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    superadmin: 'destructive',
    admin: 'default',
    kasir: 'secondary',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ Tambah Pengguna</Button>
      </div>

      <Card>
        {list.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <span className="text-4xl mb-2">👤</span>
            <p className="text-sm text-muted-foreground">Belum ada pengguna</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['Nama', 'Email', 'Role'].map((h) => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[u.role] ?? 'outline'} className="capitalize">{u.role}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setFormError('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Pengguna</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as BuatPenggunaInput['role'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="kasir">Kasir</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={createMutation.isPending}
                onClick={() => {
                  if (!form.nama.trim() || !form.email.trim() || !form.password.trim()) {
                    setFormError('Semua field wajib diisi'); return
                  }
                  setFormError(''); createMutation.mutate(form)
                }}
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={() => { setOpen(false); setFormError('') }}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
