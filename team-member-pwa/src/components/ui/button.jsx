import * as React from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = {
 default: 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800',
 destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
 outline: 'border border-[var(--border-primary)] bg-[var(--bg-card)] text-gray-700 hover:bg-gray-50 active:bg-gray-100',
 'outline-destructive': 'border border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100',
 secondary: 'bg-teal-50 text-teal-700 hover:bg-teal-100 active:bg-teal-200',
 ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
 link: 'text-teal-600 underline-offset-4 hover:underline',
};

const buttonSizes = {
 default: 'h-11 px-5 py-2.5 text-sm',
 sm: 'h-9 px-3 text-xs',
 lg: 'h-12 px-8 text-base',
 icon: 'h-10 w-10',
};

const Button = React.forwardRef(
 ({ className, variant = 'default', size = 'default', ...props }, ref) => {
 return (
 <button
 className={cn(
 'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
 buttonVariants[variant],
 buttonSizes[size],
 className
 )}
 ref={ref}
 {...props}
 />
 );
 }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
