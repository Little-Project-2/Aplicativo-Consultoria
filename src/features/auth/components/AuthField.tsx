import type { InputHTMLAttributes, ReactNode } from 'react';

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  action?: ReactNode;
  icon?: ReactNode;
  label: string;
};

export function AuthField({ action, icon, id, label, ...inputProps }: AuthFieldProps) {
  return (
    <label className="authx-field" htmlFor={id}>
      <span className="authx-field-label">{label}</span>
      <span className="authx-input-shell">
        {icon ? <span className="authx-field-icon">{icon}</span> : null}
        <input id={id} {...inputProps} />
        {action}
      </span>
    </label>
  );
}
