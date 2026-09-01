import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, FileImage, CheckCircle2, Link, Eye, EyeOff, ChevronDown, ChevronUp,
  AlignLeft, AlignCenter, AlignRight, Bold, Move, Pencil, Trash2, X,
} from 'lucide-react'
import { templateApi } from '@/lib/api'
import type { BuatTemplateInput, LayoutField, LayoutFieldItem, TemplateSertifikat } from 'shared'
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

export type FieldKey =
  | 'namaDonatur'
  | 'alamat'
  | 'program'
  | 'nominalAngka'
  | 'deskripsiWakaf'
  | 'jumlahTerbilang'
  | 'noSertifikat'
  | 'tanggalTerbit'

export const FIELD_LABELS: Record<FieldKey, string> = {
  namaDonatur: 'Nama Donatur',
  alamat: 'Alamat Donatur',
  program: 'Program',
  nominalAngka: 'Nominal Angka (3 Digit)',
  deskripsiWakaf: 'Deskripsi Wakaf',
  jumlahTerbilang: 'Jumlah Terbilang',
  noSertifikat: 'No. Sertifikat',
  tanggalTerbit: 'Tanggal Terbit',
}

// Contoh teks yang ditampilkan di canvas supaya posisi & ukuran terasa nyata
export const FIELD_SAMPLE: Record<FieldKey, string> = {
  namaDonatur: 'Budi Santoso',
  alamat: 'Jl. Margorejo Indah No. 50, Surabaya',
  program: 'Wakaf Produktif Masjid',
  nominalAngka: 'Rp 100.000.000',
  deskripsiWakaf: 'Telah mewakafkan tanah seluas 100 m²',
  jumlahTerbilang: 'Seratus Juta Rupiah',
  noSertifikat: 'CERT-WKF/2026/09/00001',
  tanggalTerbit: '1 September 2026',
}

export const ALL_FIELD_KEYS: FieldKey[] = [
  'namaDonatur',
  'alamat',
  'program',
  'nominalAngka',
  'deskripsiWakaf',
  'jumlahTerbilang',
  'noSertifikat',
  'tanggalTerbit',
]

export const DEFAULT_FIELD_CONFIG: Record<FieldKey, LayoutFieldItem> = {
  namaDonatur: { x: 1000, y: 680, size: 56, align: 'center', bold: true },
  alamat: { x: 1000, y: 740, size: 30, align: 'center', bold: false },
  program: { x: 1000, y: 820, size: 36, align: 'center', bold: true },
  nominalAngka: { x: 1000, y: 880, size: 38, align: 'center', bold: true },
  deskripsiWakaf: { x: 1000, y: 940, size: 32, align: 'center', bold: false },
  jumlahTerbilang: { x: 1000, y: 1000, size: 32, align: 'center', bold: false },
  noSertifikat: { x: 1820, y: 1345, size: 22, align: 'right', bold: false },
  tanggalTerbit: { x: 1820, y: 1375, size: 22, align: 'right', bold: false },
}

const DEFAULT_LAYOUT: LayoutField = {
  namaDonatur: DEFAULT_FIELD_CONFIG.namaDonatur,
  deskripsiWakaf: DEFAULT_FIELD_CONFIG.deskripsiWakaf,
  jumlahTerbilang: DEFAULT_FIELD_CONFIG.jumlahTerbilang,
  noSertifikat: DEFAULT_FIELD_CONFIG.noSertifikat,
  tanggalTerbit: DEFAULT_FIELD_CONFIG.tanggalTerbit,
  canvasWidth: 2000,
  canvasHeight: 1414,
}

type AlignValue = 'left' | 'center' | 'right'

/** Canvas visual: background sertifikat + label tiap field aktif yang bisa diseret (drag) langsung untuk mengatur posisi x/y. */
function PositionCanvas({
  backgroundUrl, canvasWidth, canvasHeight, layout, selected, onSelect, onChangePosition,
}: {
  backgroundUrl: string
  canvasWidth: number
  canvasHeight: number
  layout: LayoutField
  selected: FieldKey | null
  onSelect: (key: FieldKey) => void
  onChangePosition: (key: FieldKey, x: number, y: number) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)
  const [draggingKey, setDraggingKey] = useState<FieldKey | null>(null)

  useEffect(() => { setImgError(false) }, [backgroundUrl])

  function posFromPointer(e: React.PointerEvent) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return null
    const relX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const relY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    return { x: Math.round(relX * canvasWidth), y: Math.round(relY * canvasHeight) }
  }

  function handleDown(e: React.PointerEvent<HTMLDivElement>, key: FieldKey) {
    e.preventDefault()
    e.stopPropagation()
    onSelect(key)
    setDraggingKey(key)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function handleMove(e: React.PointerEvent<HTMLDivElement>, key: FieldKey) {
    if (draggingKey !== key) return
    const pos = posFromPointer(e)
    if (pos) onChangePosition(key, pos.x, pos.y)
  }
  function handleUp(e: React.PointerEvent<HTMLDivElement>) {
    setDraggingKey(null)
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }

  const showPlaceholder = !backgroundUrl || imgError
  const activeKeys = ALL_FIELD_KEYS.filter((k) => Boolean(layout[k]))

  return (
    <div
      ref={canvasRef}
      className="relative w-full rounded-lg overflow-hidden border-2 select-none"
      style={{
        aspectRatio: `${canvasWidth} / ${canvasHeight}`,
        borderColor: GOLD,
        containerType: 'inline-size',
        backgroundColor: '#EDE4D8',
        backgroundImage: showPlaceholder
          ? 'repeating-linear-gradient(45deg, rgba(43,15,23,0.06) 0 10px, transparent 10px 20px)'
          : undefined,
        touchAction: 'none',
      } as React.CSSProperties}
    >
      {backgroundUrl && !imgError && (
        <img
          src={backgroundUrl}
          alt="Background template"
          className="absolute inset-0 h-full w-full object-fill pointer-events-none"
          onError={() => setImgError(true)}
        />
      )}

      {!backgroundUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-center px-8">
          <p className="text-xs text-muted-foreground">
            Isi URL background untuk melihat pratinjau. Posisi teks tetap bisa diatur di sini.
          </p>
        </div>
      )}

      {activeKeys.map((key) => {
        const field = layout[key] as LayoutFieldItem
        if (!field) return null
        const isSelected = key === selected
        const translate =
          field.align === 'left' ? '0%, -50%' :
            field.align === 'right' ? '-100%, -50%' : '-50%, -50%'
        return (
          <div
            key={key}
            onPointerDown={(e) => handleDown(e, key)}
            onPointerMove={(e) => handleMove(e, key)}
            onPointerUp={handleUp}
            className="absolute cursor-move whitespace-nowrap rounded px-1.5 py-0.5"
            style={{
              left: `${(field.x / canvasWidth) * 100}%`,
              top: `${(field.y / canvasHeight) * 100}%`,
              transform: `translate(${translate})`,
              fontSize: `clamp(9px, ${(field.size / canvasWidth) * 100}cqw, 400px)`,
              fontWeight: field.bold ? 700 : 400,
              textAlign: field.align,
              color: MAROON,
              backgroundColor: isSelected ? 'rgba(184,134,63,0.35)' : 'rgba(255,255,255,0.55)',
              boxShadow: isSelected ? `0 0 0 2px ${GOLD}` : '0 0 0 1px rgba(43,15,23,0.12)',
              zIndex: isSelected ? 10 : 1,
            }}
          >
            {FIELD_SAMPLE[key]}
          </div>
        )
      })}

      {/* Petunjuk kecil */}
      <div
        className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-white/90 pointer-events-none"
        style={{ backgroundColor: 'rgba(43,15,23,0.55)' }}
      >
        <Move className="h-2.5 w-2.5" />
        Seret label untuk mengatur posisi
      </div>
    </div>
  )
}

/** Panel kontrol untuk field yang sedang dipilih: ukuran, alignment, ketebalan, x/y presisi, dan opsi exclude. */
function FieldControlPanel({
  label, field, onChange, onRemove,
}: {
  label: string
  field: LayoutFieldItem
  onChange: (updated: LayoutFieldItem) => void
  onRemove?: () => void
}) {
  const alignOptions: { value: AlignValue; Icon: typeof AlignLeft }[] = [
    { value: 'left', Icon: AlignLeft },
    { value: 'center', Icon: AlignCenter },
    { value: 'right', Icon: AlignRight },
  ]

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">x: {field.x} · y: {field.y}</p>
      </div>

      <div className="space-y-3">
        {/* Baris 1: Ukuran Teks */}
        <div className="space-y-1">
          <Label className="text-[10px]">Ukuran Teks</Label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={120}
              value={field.size}
              onChange={(e) => onChange({ ...field, size: Number(e.target.value) })}
              className="min-w-0 flex-1 accent-[#B8863F]"
            />
            <Input
              type="number"
              value={field.size}
              onChange={(e) => onChange({ ...field, size: Number(e.target.value) })}
              className="h-7 w-14 text-xs shrink-0"
            />
          </div>
        </div>

        {/* Baris 2: Alignment & Ketebalan berdampingan */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Alignment */}
          <div className="space-y-1">
            <Label className="text-[10px]">Alignment</Label>
            <div className="flex h-7 items-center gap-1">
              {alignOptions.map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...field, align: value })}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors"
                  style={
                    field.align === value
                      ? { backgroundColor: MAROON, borderColor: MAROON, color: '#fff' }
                      : { borderColor: 'var(--border)', color: MAROON }
                  }
                  aria-pressed={field.align === value}
                  aria-label={`Align ${value}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Bold Toggle */}
          <div className="space-y-1">
            <Label className="text-[10px]">Ketebalan</Label>
            <button
              type="button"
              onClick={() => onChange({ ...field, bold: !field.bold })}
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors"
              style={
                field.bold
                  ? { backgroundColor: MAROON, borderColor: MAROON, color: '#fff' }
                  : { borderColor: 'var(--border)', color: MAROON }
              }
              aria-pressed={field.bold}
            >
              <Bold className="h-3.5 w-3.5" />
              {field.bold ? 'Tebal' : 'Normal'}
            </button>
          </div>
        </div>
      </div>

      {/* X/Y presisi tersinkron dengan drag di canvas */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
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
      </div>

      {/* Tombol Exclude / Hapus Field */}
      {onRemove && (
        <div className="pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 gap-1.5 h-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Exclude / Hapus dari Template
          </Button>
        </div>
      )}
    </div>
  )
}

export default function TemplateEditorPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [previewBg, setPreviewBg] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [bgError, setBgError] = useState(false)
  const [selectedField, setSelectedField] = useState<FieldKey | null>('namaDonatur')

  const [form, setForm] = useState<BuatTemplateInput & { tipe?: string }>({
    namaTemplate: '',
    fileBackground: '',
    layoutField: DEFAULT_LAYOUT,
    tipe: 'wakaf',
  } as any)
  const [formError, setFormError] = useState('')

  const { data: tmplRes, isLoading } = useQuery({
    queryKey: ['template'],
    queryFn: templateApi.list,
  })
  const templates = tmplRes?.data ?? []
  const activeWakafTemplate = templates.find((t) => t.aktif && (t as any).tipe === 'wakaf')
  const activeZakatTemplate = templates.find((t) => t.aktif && (t as any).tipe === 'zakat')
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BuatTemplateInput> }) =>
      templateApi.update(id, data),
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
    setEditId(null)
    setFormError('')
    setPreviewBg(false)
    setBgError(false)
    setShowAdvanced(true)
    setSelectedField('namaDonatur')
    setForm({ namaTemplate: '', fileBackground: '', layoutField: DEFAULT_LAYOUT, tipe: 'wakaf' } as any)
  }

  function openEdit(t: TemplateSertifikat) {
    setEditId(t.id)
    const raw = (t.layoutField || {}) as any
    const normalizedLayout: LayoutField = {
      canvasWidth: raw.canvasWidth || 2000,
      canvasHeight: raw.canvasHeight || 1414,
    }
    if (raw.namaDonatur) normalizedLayout.namaDonatur = raw.namaDonatur
    if (raw.alamat || raw.alamatDonatur) normalizedLayout.alamat = raw.alamat || raw.alamatDonatur
    if (raw.program || raw.namaProgram) normalizedLayout.program = raw.program || raw.namaProgram
    if (raw.nominalAngka || raw.nominal) normalizedLayout.nominalAngka = raw.nominalAngka || raw.nominal
    if (raw.deskripsiWakaf) normalizedLayout.deskripsiWakaf = raw.deskripsiWakaf
    if (raw.jumlahTerbilang) normalizedLayout.jumlahTerbilang = raw.jumlahTerbilang
    if (raw.noSertifikat) normalizedLayout.noSertifikat = raw.noSertifikat
    if (raw.tanggalTerbit) normalizedLayout.tanggalTerbit = raw.tanggalTerbit

    setForm({
      namaTemplate: t.namaTemplate,
      fileBackground: t.fileBackground,
      layoutField: normalizedLayout,
      tipe: (t as any).tipe ?? 'wakaf',
    } as any)
    setFormError('')
    setPreviewBg(false)
    setBgError(false)
    setShowAdvanced(true)

    const activeKeys = ALL_FIELD_KEYS.filter((k) => normalizedLayout[k])
    setSelectedField(activeKeys[0] || null)
    setOpen(true)
  }

  function updateField(key: FieldKey, value: LayoutFieldItem) {
    setForm((prev) => ({
      ...prev,
      layoutField: { ...prev.layoutField, [key]: value },
    }))
  }

  function addField(key: FieldKey) {
    setForm((prev) => ({
      ...prev,
      layoutField: {
        ...prev.layoutField,
        [key]: DEFAULT_FIELD_CONFIG[key],
      },
    }))
    setSelectedField(key)
  }

  function removeField(key: FieldKey) {
    setForm((prev) => {
      const nextLayout = { ...prev.layoutField }
      delete nextLayout[key]
      return {
        ...prev,
        layoutField: nextLayout,
      }
    })
    if (selectedField === key) {
      const remaining = ALL_FIELD_KEYS.filter((k) => k !== key && form.layoutField[k])
      setSelectedField(remaining.length > 0 ? remaining[0] : null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.namaTemplate.trim()) { setFormError('Nama template wajib diisi'); return }
    if (!form.fileBackground.trim()) { setFormError('URL/path background wajib diisi'); return }
    setFormError('')
    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const activeFields = ALL_FIELD_KEYS.filter((k) => Boolean(form.layoutField[k]))
  const inactiveFields = ALL_FIELD_KEYS.filter((k) => !form.layoutField[k])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: MAROON }}>Template Sertifikat</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola desain dan layout sertifikat wakaf & zakat
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
      {(activeWakafTemplate || activeZakatTemplate || (!activeWakafTemplate && !activeZakatTemplate && activeTemplate)) && (
        <div className="space-y-3">
          {[
            activeWakafTemplate ?? (!activeWakafTemplate && !activeZakatTemplate ? activeTemplate : null),
            activeZakatTemplate,
          ]
            .filter(Boolean)
            .map((tmpl) => tmpl && (
            <div
              key={tmpl.id}
              className="rounded-xl border-2 p-4 flex items-center gap-4"
              style={{ borderColor: GOLD, backgroundColor: GOLD_SOFT }}
            >
              {tmpl.fileBackground && (
                <img
                  src={tmpl.fileBackground}
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
                  <Badge variant="outline" className="text-xs capitalize">
                    {(tmpl as any).tipe ?? 'wakaf'}
                  </Badge>
                </div>
                <p className="font-semibold" style={{ color: MAROON }}>{tmpl.namaTemplate}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{tmpl.fileBackground}</p>
              </div>
            </div>
          ))}
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
                    <Badge variant="outline" className="text-xs capitalize shrink-0">
                      {(t as any).tipe ?? 'wakaf'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Link className="h-3 w-3 shrink-0" />
                    {t.fileBackground || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Canvas: {(t.layoutField as LayoutField).canvasWidth} × {(t.layoutField as LayoutField).canvasHeight} px
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openEdit(t as TemplateSertifikat)}
                    style={{ borderColor: GOLD, color: MAROON }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {!t.aktif && (
                    <Button
                      id={`btn-aktifkan-template-${t.id}`}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={aktifMutation.isPending}
                      onClick={() => aktifMutation.mutate(t.id)}
                      style={{ borderColor: GOLD, color: MAROON }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aktifkan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Tambah / Edit */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="w-[95vw] sm:max-w-[95vw] lg:max-w-7xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId !== null ? 'Edit Template Sertifikat' : 'Tambah Template Sertifikat'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Tipe Template */}
            <div className="space-y-1.5">
              <Label htmlFor="tipeTemplate">
                Tipe <span className="text-destructive">*</span>
              </Label>
              <select
                id="tipeTemplate"
                value={(form as any).tipe ?? 'wakaf'}
                onChange={(e) => setForm({ ...form, tipe: e.target.value } as any)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--border)' }}
              >
                <option value="wakaf">Wakaf</option>
                <option value="zakat">Zakat</option>
              </select>
            </div>

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

            {/* Layout Fields — canvas interaktif drag & drop & konfigurasi variabel */}
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span>Atur Posisi & Variabel Teks</span>
                {showAdvanced
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    Kelola variabel yang ingin disertakan pada sertifikat. Seret label langsung di canvas untuk mengatur posisi, atau klik salah satu label untuk mengubah ukuran, alignment, dan ketebalannya.
                  </p>

                  {/* Kelompok Variabel Aktif (Included) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Variabel Aktif ({activeFields.length})
                    </Label>
                    {activeFields.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-1">
                        Belum ada variabel yang disertakan. Klik variabel di bawah untuk menambahkannya.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {activeFields.map((key) => {
                          const isSelected = selectedField === key
                          return (
                            <div
                              key={key}
                              className="inline-flex items-center rounded-full border transition-all overflow-hidden"
                              style={{
                                borderColor: isSelected ? MAROON : GOLD,
                                backgroundColor: isSelected ? MAROON : GOLD_SOFT,
                                color: isSelected ? '#fff' : MAROON,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedField(key)}
                                className="px-3 py-1 text-xs font-medium focus:outline-none"
                              >
                                {FIELD_LABELS[key]}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeField(key)
                                }}
                                className="pr-2 pl-1 py-1 hover:opacity-75 focus:outline-none"
                                title={`Exclude ${FIELD_LABELS[key]}`}
                                aria-label={`Exclude ${FIELD_LABELS[key]}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Kelompok Variabel Opsional (Excluded / Bisa ditambahkan) */}
                  {inactiveFields.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Tambah Variabel Lain (Opsional):
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {inactiveFields.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => addField(key)}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/50 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-muted/50 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            {FIELD_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Canvas dan Panel Kontrol Field */}
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start pt-2">
                    <PositionCanvas
                      backgroundUrl={form.fileBackground}
                      canvasWidth={form.layoutField.canvasWidth}
                      canvasHeight={form.layoutField.canvasHeight}
                      layout={form.layoutField}
                      selected={selectedField}
                      onSelect={(k) => setSelectedField(k)}
                      onChangePosition={(key, x, y) => {
                        const current = form.layoutField[key]
                        if (current) updateField(key, { ...current, x, y })
                      }}
                    />

                    {selectedField && form.layoutField[selectedField] ? (
                      <FieldControlPanel
                        label={FIELD_LABELS[selectedField]}
                        field={form.layoutField[selectedField] as LayoutFieldItem}
                        onChange={(val) => updateField(selectedField, val)}
                        onRemove={() => removeField(selectedField)}
                      />
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                        Pilih salah satu variabel aktif untuk mengedit posisinya.
                      </div>
                    )}
                  </div>
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
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 text-white hover:opacity-90"
                style={{ backgroundColor: MAROON }}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Menyimpan...' : editId !== null ? 'Perbarui Template' : 'Simpan Template'}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}