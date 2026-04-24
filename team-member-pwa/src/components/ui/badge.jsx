import * as React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
 default: 'bg-teal-100 text-teal-800 border-teal-200',
 secondary: 'bg-gray-100 text-gray-700 border-gray-200',
 destructive: 'bg-red-100 text-red-700 border-red-200',
 success: 'bg-green-100 text-green-700 border-green-200',
 warning: 'bg-amber-100 text-amber-700 border-amber-200',
 outline: 'bg-transparent text-gray-600 border-gray-300',
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
