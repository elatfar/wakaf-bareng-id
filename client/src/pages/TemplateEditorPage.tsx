import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateApi } from '@/lib/api'
import type { BuatTemplateInput, LayoutField } from 'shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const DEFAULT_LAYOUT: LayoutField = {
  namaDonatur:    { x: 1000, y: 720,  size: 58, align: 'center', bold: true  },
  deskripsiWakaf: { x: 1000, y: 900,  size: 36, align: 'center', bold: false },
  jumlahTerbilang:{ x: 1000, y: 955,  size: 34, align: 'center', bold: true  },
  noSertifikat:   { x: 1820, y: 1345, size: 22, align: 'right',  bold: false },
  tanggalTerbit:  { x: 1820, y: 1375, size: 22, align: 'right',  bold: false },
  canvasWidth: 2000,
  canvasHeight: 1414,
}

export default function TemplateEditorPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BuatTemplateInput>({
    namaTemplate: '',
    fileBackground: 'storage/backgrounds/BG-Sertifikat.png',
    layoutField: DEFAULT_LAYOUT,
  })
  const [layoutJson, setLayoutJson] = useState(JSON.stringify(DEFAULT_LAYOUT, null, 2))
  const [jsonError, setJsonError] = useState('')
  const [formError, setFormError] = useState('')

  const { data: tmplRes, isLoading } = useQuery({ queryKey: ['template'], queryFn: templateApi.list })
  const templates = tmplRes?.data ?? []

  const createMutation = useMutation({
    mutationFn: templateApi.create,
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: ['template'] })
        setOpen(false); setFormError('')
        setForm({ namaTemplate: '', fileBackground: 'storage/backgrounds/BG-Sertifikat.png', layoutField: DEFAULT_LAYOUT })
        setLayoutJson(JSON.stringify(DEFAULT_LAYOUT, null, 2))
      } else setFormError(r.message ?? 'Gagal menyimpan')
    },
  })

  const aktifMutation = useMutation({
    mutationFn: (id: number) => templateApi.setAktif(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template'] }),
  })

  function handleLayoutChange(val: string) {
    setLayoutJson(val)
    try { setForm({ ...form, layoutField: JSON.parse(val) as LayoutField }); setJsonError('') }
    catch { setJsonError('JSON tidak valid') }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.namaTemplate.trim()) { setFormError('Nama template wajib diisi'); return }
    if (jsonError) { setFormError('Perbaiki JSON layoutField'); return }
    setFormError('')
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Template Sertifikat</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola desain dan layout sertifikat wakaf</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Tambah Template</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Card key={i} className="h-20 animate-pulse bg-muted" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-3">🖼</span>
          <p className="text-sm text-muted-foreground">Belum ada template. Tambahkan template untuk menerbitkan sertifikat.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className={t.aktif ? 'border-2 border-ring' : ''}>
              <CardContent className="flex items-center justify-between pt-5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.namaTemplate}</span>
                    {t.aktif && <Badge variant="default">★ Aktif</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.fileBackground}</p>
                </div>
                {!t.aktif && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={aktifMutation.isPending}
                    onClick={() => aktifMutation.mutate(t.id)}
                  >
                    Aktifkan
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setFormError('') } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Template Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nama Template <span className="text-destructive">*</span></Label>
                <Input
                  value={form.namaTemplate}
                  onChange={(e) => setForm({ ...form, namaTemplate: e.target.value })}
                  placeholder="Template Utama 2026"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Path Background</Label>
                <Input
                  value={form.fileBackground}
                  onChange={(e) => setForm({ ...form, fileBackground: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Layout Field (JSON)</Label>
              <textarea
                value={layoutJson}
                onChange={(e) => handleLayoutChange(e.target.value)}
                rows={12}
                className={`w-full px-3 py-2 text-xs font-mono rounded-md border bg-background outline-none resize-y ${jsonError ? 'border-destructive' : 'border-input'}`}
              />
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            </div>
            {formError && (
              <p className="text-xs py-2 px-3 rounded-md bg-destructive/10 text-destructive">{formError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan Template'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setFormError('') }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
