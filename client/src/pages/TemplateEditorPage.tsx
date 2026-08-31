import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileImage, CheckCircle2, Link, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { templateApi } from '@/lib/api'
import type { BuatTemplateInput, LayoutField } from 'shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const MAROON = '#2B0F17'
const GOLD = '#B8863F'
const GOLD_SOFT = '#F3E7DC'

const DEFAULT_LAYOUT: LayoutField = {
  namaDonatur:    { x: 1000, y: 720,  size: 58, align: 'center', bold: true  },
  deskripsiWakaf: { x: 1000, y: 900,  size: 36, align: 'center', bold: false },
  jumlahTerbilang:{ x: 1000, y: 955,  size: 34, align: 'center', bold: true  },
  noSertifikat:   { x: 1820, y: 1345, size: 22, align: 'right',  bold: false },
  tanggalTerbit:  { x: 1820, y: 1375, size: 22, align: 'right',  bold: false },
  canvasWidth: 2000,
  canvasHeight: 1414,
}

type AlignValue = 'left' | 'center' | 'right'
type FieldKey = 'namaDonatur' | 'deskripsiWakaf' | 'jumlahTerbilang' | 'noSertifikat' | 'tanggalTerbit'

const FIELD_LABELS: Record<FieldKey, string> = {
  namaDonatur: 'Nama Donatur',
  deskripsiWakaf: 'Deskripsi Wakaf',
  jumlahTerbilang: 'Jumlah Terbilang',
  noSertifikat: 'No. Sertifikat',
  tanggalTerbit: 'Tanggal Terbit',
}

const FIELD_KEYS: FieldKey[] = [
  'namaDonatur', 'deskripsiWakaf', 'jumlahTerbilang', 'noSertifikat', 'tanggalTerbit'
]

function FieldEditor({
  label, field, onChange,
}: {
  label: string
  field: LayoutField[FieldKey]
  onChange: (updated: LayoutField[FieldKey]) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="grid grid-cols-5 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">X (px)</Label>
          <Input
            type="number"
            value={field.x}
            onChange={(e) => onChange({ ...field, x: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Y (px)</Label>
          <Input
            type="number"
            value={field.y}
            onChange={(e) => onChange({ ...field, y: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Ukuran</Label>
          <Input
            type="number"
            value={field.size}
            onChange={(e) => onChange({ ...field, size: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Align</Label>
          <select
            value={field.align}
            onChange={(e) => onChange({ ...field, align: e.target.value as AlignValue })}
            className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Tebal?</Label>
          <div className="flex h-7 items-center">
            <input
              type="checkbox"
              checked={field.bold}
              onChange={(e) => onChange({ ...field, bold: e.target.checked })}
              className="h-4 w-4 accent-[#2B0F17]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TemplateEditorPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [previewBg, setPreviewBg] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [bgError, setBgError] = useState(false)

  const [form, setForm] = useState<BuatTemplateInput>({
    namaTemplate: '',
    fileBackground: '',
    layoutField: DEFAULT_LAYOUT,
  })
  const [formError, setFormError] = useState('')

  const { data: tmplRes, isLoading } = useQuery({
    queryKey: ['template'],
    queryFn: templateApi.list,
  })
  const templates = tmplRes?.data ?? []
  const activeTemplate = templates.find((t) => t.aktif)

  const createMutation = useMutation({
    mutationFn: templateApi.create,
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: ['template'] })
        closeDialog()
      } else setFormError(r.message ?? 'Gagal menyimpan')
    },
  })

  const aktifMutation = useMutation({
    mutationFn: (id: number) => templateApi.setAktif(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template'] }),
  })

  function closeDialog() {
    setOpen(false)
    setFormError('')
    setPreviewBg(false)
    setBgError(false)
    setShowAdvanced(false)
    setForm({ namaTemplate: '', fileBackground: '', layoutField: DEFAULT_LAYOUT })
  }

  function updateField(key: FieldKey, value: LayoutField[FieldKey]) {
    setForm((prev) => ({
      ...prev,
      layoutField: { ...prev.layoutField, [key]: value },
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.namaTemplate.trim()) { setFormError('Nama template wajib diisi'); return }
    if (!form.fileBackground.trim()) { setFormError('URL/path background wajib diisi'); return }
    setFormError('')
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: MAROON }}>Template Sertifikat</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola desain dan layout sertifikat wakaf
          </p>
        </div>
        <Button
          id="btn-tambah-template"
          onClick={() => setOpen(true)}
          className="gap-1.5 text-white hover:opacity-90"
          style={{ backgroundColor: MAROON }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Tambah Template
        </Button>
      </div>

      {/* Active template highlight */}
      {activeTemplate && (
        <div
          className="rounded-xl border-2 p-4 flex items-center gap-4"
          style={{ borderColor: GOLD, backgroundColor: GOLD_SOFT }}
        >
          {activeTemplate.fileBackground && (
            <img
              src={activeTemplate.fileBackground}
              alt="bg"
              className="h-20 w-32 rounded-md object-cover border border-black/10 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: GOLD }}>
                Template Aktif
              </span>
            </div>
            <p className="font-semibold" style={{ color: MAROON }}>{activeTemplate.namaTemplate}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{activeTemplate.fileBackground}</p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: GOLD_SOFT, color: GOLD }}
          >
            <FileImage className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-muted-foreground">
            Belum ada template. Tambahkan template untuk menerbitkan sertifikat.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card
              key={t.id}
              className="overflow-hidden transition-shadow hover:shadow-md"
              style={t.aktif ? { borderColor: GOLD, borderWidth: 2 } : {}}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Background thumbnail */}
                <div
                  className="h-16 w-24 shrink-0 rounded-md overflow-hidden border border-black/10 bg-muted flex items-center justify-center"
                >
                  {t.fileBackground ? (
                    <img
                      src={t.fileBackground}
                      alt={t.namaTemplate}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                        el.parentElement!.innerHTML = '<span style="font-size:24px">🖼</span>'
                      }}
                    />
                  ) : (
                    <FileImage className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{t.namaTemplate}</span>
                    {t.aktif && (
                      <Badge
                        className="text-xs shrink-0"
                        style={{ backgroundColor: GOLD, color: '#fff', border: 'none' }}
                      >
                        ★ Aktif
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Link className="h-3 w-3 shrink-0" />
                    {t.fileBackground || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Canvas: {(t.layoutField as LayoutField).canvasWidth} × {(t.layoutField as LayoutField).canvasHeight} px
                  </p>
                </div>

                {/* Action */}
                {!t.aktif && (
                  <Button
                    id={`btn-aktifkan-template-${t.id}`}
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={aktifMutation.isPending}
                    onClick={() => aktifMutation.mutate(t.id)}
                    style={{ borderColor: GOLD, color: MAROON }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aktifkan
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Tambah */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Template Sertifikat</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Nama */}
            <div className="space-y-1.5">
              <Label htmlFor="namaTemplate">
                Nama Template <span className="text-destructive">*</span>
              </Label>
              <Input
                id="namaTemplate"
                value={form.namaTemplate}
                onChange={(e) => setForm({ ...form, namaTemplate: e.target.value })}
                placeholder="cth. Template Utama 2026"
              />
            </div>

            {/* Background URL */}
            <div className="space-y-1.5">
              <Label htmlFor="fileBackground">
                URL / Link Gambar Background <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="fileBackground"
                  value={form.fileBackground}
                  onChange={(e) => {
                    setForm({ ...form, fileBackground: e.target.value })
                    setBgError(false)
                    setPreviewBg(false)
                  }}
                  placeholder="https://... atau storage/backgrounds/bg.png"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 px-3"
                  onClick={() => { setPreviewBg((v) => !v); setBgError(false) }}
                  disabled={!form.fileBackground.trim()}
                >
                  {previewBg ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {previewBg ? 'Tutup' : 'Preview'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Gunakan URL gambar publik (HTTPS) atau path relatif di server.
              </p>

              {/* Preview */}
              {previewBg && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border bg-muted">
                  {bgError ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                      <FileImage className="h-8 w-8" />
                      <p className="text-xs">Gambar tidak dapat dimuat. Periksa URL.</p>
                    </div>
                  ) : (
                    <img
                      src={form.fileBackground}
                      alt="Preview background"
                      className="w-full max-h-48 object-cover"
                      onError={() => setBgError(true)}
                      onLoad={() => setBgError(false)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Canvas size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="canvasWidth">Lebar Canvas (px)</Label>
                <Input
                  id="canvasWidth"
                  type="number"
                  value={form.layoutField.canvasWidth}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      layoutField: { ...form.layoutField, canvasWidth: Number(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="canvasHeight">Tinggi Canvas (px)</Label>
                <Input
                  id="canvasHeight"
                  type="number"
                  value={form.layoutField.canvasHeight}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      layoutField: { ...form.layoutField, canvasHeight: Number(e.target.value) },
                    })
                  }
                />
              </div>
            </div>

            {/* Layout Fields (collapsible) */}
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span>Posisi Teks (Layout Field)</span>
                {showAdvanced
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    Atur posisi (X/Y dari kiri atas), ukuran font, alignment, dan ketebalan tiap teks.
                  </p>
                  {FIELD_KEYS.map((key) => (
                    <FieldEditor
                      key={key}
                      label={FIELD_LABELS[key]}
                      field={form.layoutField[key] as LayoutField[FieldKey]}
                      onChange={(val) => updateField(key, val)}
                    />
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <p className="text-xs py-2 px-3 rounded-md bg-destructive/10 text-destructive">{formError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                id="btn-submit-template"
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 text-white hover:opacity-90"
                style={{ backgroundColor: MAROON }}
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan Template'}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
