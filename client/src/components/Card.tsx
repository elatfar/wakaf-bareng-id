export default function Card({
  children,
  className = '',
  topAccent = false,
}: {
  children: React.ReactNode;
  className?: string;
  topAccent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderTop: topAccent ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}
