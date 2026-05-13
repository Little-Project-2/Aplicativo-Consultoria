import type { ReactNode } from 'react';

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className = '' }: AuthCardProps) {
  return <article className={`authx-card ${className}`.trim()}>{children}</article>;
}
