import * as React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-border)]',
  secondary: 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  destructive: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-border)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-border)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-border)]',
  outline: 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]',
};

function Badge({ className, variant = 'default', ...props }) {
 return (
 <span
 className={cn(
 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
 badgeVariants[variant],
 className
 )}
 {...props}
 />
 );
}

export { Badge, badgeVariants };
