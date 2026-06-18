import * as React from 'react';
import { cn } from '../../lib/utils';

function Tabs({ value, onValueChange, children, className }) {
 return (
 <div className={cn('w-full', className)}>
 {React.Children.map(children, (child) => {
 if (React.isValidElement(child)) {
 return React.cloneElement(child, { activeValue: value, onValueChange });
 }
 return child;
 })}
 </div>
 );
}

function TabsList({ children, className, activeValue, onValueChange }) {
  return (
    <div
      className={cn(
        'flex gap-1 rounded-full bg-[var(--color-surface-muted)] p-1 overflow-x-auto scrollbar-hide',
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeValue, onValueChange });
        }
        return child;
      })}
    </div>
  );
}

function TabsTrigger({ value, children, className, activeValue, onValueChange }) {
  const isActive = activeValue === value;

  return (
    <button
      className={cn(
        'flex-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 min-h-[36px]',
        isActive
          ? 'bg-[var(--color-primary)] text-white shadow-sm'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
        className
      )}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children, className, activeValue }) {
 if (activeValue !== value) return null;

 return (
 <div className={cn('mt-3 page-enter', className)}>
 {children}
 </div>
 );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
