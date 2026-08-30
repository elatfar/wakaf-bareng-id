type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className = '',
  size = 'md',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none cursor-pointer';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? '#9CA3AF' : 'var(--color-primary)',
      color: 'var(--color-primary-text)',
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid var(--color-primary)',
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    danger: {
      backgroundColor: disabled ? '#9CA3AF' : 'var(--color-danger)',
      color: 'white',
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-muted)',
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${className}`}
      style={variants[variant]}
    >
      {children}
    </button>
  );
}
