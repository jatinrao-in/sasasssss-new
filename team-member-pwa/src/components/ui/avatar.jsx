import * as React from 'react';
import { cn } from '../../lib/utils';

const Avatar = React.forwardRef(({ className, src, alt, fallback, size = 'default', ...props }, ref) => {
 const sizes = {
 sm: 'h-8 w-8 text-xs',
 default: 'h-10 w-10 text-sm',
 lg: 'h-16 w-16 text-lg',
 xl: 'h-24 w-24 text-2xl',
 };

 return (
 <div
 ref={ref}
 className={cn(
 'relative flex shrink-0 overflow-hidden rounded-full',
 sizes[size],
 className
 )}
 {...props}
 >
 {src ? (
 <img className="aspect-square h-full w-full object-cover" src={src} alt={alt} />
 ) : (
 <div className="flex h-full w-full items-center justify-center bg-teal-100 text-teal-700 font-semibold">
 {fallback || (alt ? alt.charAt(0).toUpperCase() : '?')}
 </div>
 )}
 </div>
 );
});
Avatar.displayName = 'Avatar';

export { Avatar };
