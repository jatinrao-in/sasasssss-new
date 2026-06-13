import * as React from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = {
 default: 'btn-primary',
 destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a]',
 outline: 'btn-secondary',
 'outline-destructive': 'border-2 border-red-500 text-red-600 hover:bg-red-50 active:bg-red-100 shadow-[2px_2px_0px_#0f172a]',
 secondary: 'btn-secondary',
 ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
 link: 'text-red-600 underline-offset-4 hover:underline font-bold',
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
 'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
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
