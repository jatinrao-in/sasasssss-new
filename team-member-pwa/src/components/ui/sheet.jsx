import * as React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

const SheetContext = React.createContext({});

function Sheet({ open, onOpenChange, children }) {
 React.useEffect(() => {
 if (open) {
 document.body.style.overflow = 'hidden';
 } else {
 document.body.style.overflow = '';
 }
 return () => {
 document.body.style.overflow = '';
 };
 }, [open]);

 return (
 <SheetContext.Provider value={{ open, onOpenChange }}>
 {children}
 </SheetContext.Provider>
 );
}

function SheetTrigger({ children, asChild, ...props }) {
 const { onOpenChange } = React.useContext(SheetContext);

 if (asChild && React.isValidElement(children)) {
 return React.cloneElement(children, {
 ...props,
 onClick: (e) => {
 children.props.onClick?.(e);
 onOpenChange?.(true);
 },
 });
 }

 return (
 <button onClick={() => onOpenChange?.(true)} {...props}>
 {children}
 </button>
 );
}

function SheetContent({ children, className, side = 'bottom', ...props }) {
 const { open, onOpenChange } = React.useContext(SheetContext);

 if (!open) return null;

 return (
 <div className="fixed inset-0 z-50" style={{ maxWidth: '430px', margin: '0 auto' }}>
 {/* Overlay */}
 <div
 className="sheet-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={() => onOpenChange?.(false)}
 />
 {/* Sheet */}
 <div
 className={cn(
 'absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[var(--bg-card)] shadow-2xl',
 'animate-[slideUp_0.3s_ease-out]',
 className
 )}
 style={{
 paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
 }}
 {...props}
 >
 {/* Handle bar */}
 <div className="flex justify-center pt-3 pb-1">
 <div className="h-1 w-10 rounded-full bg-gray-300" />
 </div>
 <div className="max-h-[80vh] overflow-y-auto px-5 pb-4">
 {children}
 </div>
 </div>

 <style>{`
 @keyframes slideUp {
 from { transform: translateY(100%); }
 to { transform: translateY(0); }
 }
 `}</style>
 </div>
 );
}

function SheetHeader({ className, children, ...props }) {
 return (
 <div className={cn('flex flex-col space-y-1 py-3', className)} {...props}>
 {children}
 </div>
 );
}

function SheetTitle({ className, ...props }) {
 return (
 <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props} />
 );
}

function SheetDescription({ className, ...props }) {
 return (
 <p className={cn('text-sm text-gray-500', className)} {...props} />
 );
}

function SheetClose({ children, ...props }) {
 const { onOpenChange } = React.useContext(SheetContext);

 if (React.isValidElement(children)) {
 return React.cloneElement(children, {
 ...props,
 onClick: (e) => {
 children.props.onClick?.(e);
 onOpenChange?.(false);
 },
 });
 }

 return (
 <button onClick={() => onOpenChange?.(false)} {...props}>
 {children}
 </button>
 );
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose };
