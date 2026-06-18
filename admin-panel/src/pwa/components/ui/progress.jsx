import * as React from 'react';
import { cn } from '../../lib/utils';

const Progress = React.forwardRef(({ className, value = 0, max = 100, ...props }, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const isHigh = percentage > 50;

  return (
    <div
      ref={ref}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          isHigh ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-warning)]'
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});
Progress.displayName = 'Progress';

export { Progress };
