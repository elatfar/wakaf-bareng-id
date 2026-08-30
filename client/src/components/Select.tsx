export default function Select({
  label,
  required,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
        </label>
      )}
      <select
        {...props}
        className="w-full px-3 py-2 text-sm rounded-lg outline-none"
        style={{
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      >
        {children}
      </select>
      {error && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  );
}
