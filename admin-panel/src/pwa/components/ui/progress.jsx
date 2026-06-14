import * as React from 'react';
import { cn } from '../../lib/utils';

const Progress = React.forwardRef(({ className, value = 0, max = 100, ...props }, ref) => {
 const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

 return (
 <div
 ref={ref}
 className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100', className)}
 {...props}
 >
 <div
 className="progress-fill h-full rounded-full bg-teal-500"
 style={{ width: `${percentage}%` }}
 />
 </div>
 );
});
Progress.displayName = 'Progress';

export { Progress };
