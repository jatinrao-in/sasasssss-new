import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
 return (
 <input
 type={type}
 className={cn(
 'input-field flex h-12 w-full',
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
