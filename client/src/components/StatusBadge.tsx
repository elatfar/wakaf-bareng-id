type Status = 'terverifikasi' | 'pending' | 'batal' | 'terbit' | 'draft' | 'dicetak' | 'dikirim';

const CONFIG: Record<Status, { bg: string; text: string; label: string }> = {
  terverifikasi: { bg: '#D1FAE5', text: '#065F46', label: 'Terverifikasi' },
  pending:       { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  batal:         { bg: '#FEE2E2', text: '#991B1B', label: 'Batal' },
  terbit:        { bg: '#DBEAFE', text: '#1E40AF', label: 'Terbit' },
  draft:         { bg: '#F3F4F6', text: '#374151', label: 'Draft' },
  dicetak:       { bg: '#EDE9FE', text: '#5B21B6', label: 'Dicetak' },
  dikirim:       { bg: '#D1FAE5', text: '#065F46', label: 'Dikirim' },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as Status] ?? { bg: '#F3F4F6', text: '#374151', label: status };
  return (
    <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}
