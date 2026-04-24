import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
 return (
 <input
 type={type}
 className={cn(
 'flex h-12 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-gray-400 transition-colors',
 'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
 'disabled:cursor-not-allowed disabled:opacity-50',
 className
 )}
 ref={ref}
 {...props}
 />
 );
});
Input.displayName = 'Input';

export { Input };
