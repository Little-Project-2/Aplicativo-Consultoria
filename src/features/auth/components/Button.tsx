import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ children, className = '', icon, loading = false, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`authx-button authx-button-${variant} ${className}`.trim()}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <span className="authx-spinner" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}
