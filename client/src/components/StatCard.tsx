export default function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl p-5 flex items-start gap-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderTop: '4px solid var(--color-primary)',
      }}>
      {icon && (
        <div className="text-3xl">{icon}</div>
      )}
      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
        <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{value}</div>
        {sub && <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}
