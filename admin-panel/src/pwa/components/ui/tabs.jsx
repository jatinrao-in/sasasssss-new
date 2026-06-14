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
 'flex gap-1 rounded-lg bg-gray-100 p-1 overflow-x-auto scrollbar-hide',
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
 'flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 min-h-[36px]',
 isActive
 ? 'bg-white text-teal-700 shadow-sm'
 : 'text-gray-500 hover:text-gray-700',
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
