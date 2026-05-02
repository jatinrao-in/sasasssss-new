import { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
 const [toasts, setToasts] = useState([]);

 const addToast = useCallback((message, type = 'info', duration = 4000) => {
 const id = Date.now() + Math.random();
 setToasts((prev) => [...prev, { id, message, type }]);
 if (duration > 0) {
 setTimeout(() => {
 setToasts((prev) => prev.filter((toast) => toast.id !== id));
 }, duration);
 }
 }, []);

 const removeToast = useCallback((id) => {
 setToasts((prev) => prev.filter((toast) => toast.id !== id));
 }, []);

 useEffect(() => {
   const handleGlobalToast = (e) => {
     if (e.detail) {
       addToast(e.detail.message, e.detail.type || 'info', e.detail.duration || 4000);
     }
   };
   window.addEventListener('toast', handleGlobalToast);
   return () => window.removeEventListener('toast', handleGlobalToast);
 }, [addToast]);

 const toastApi = {
 success: (message) => addToast(message, 'success'),
 error: (message) => addToast(message, 'error'),
 warning: (message) => addToast(message, 'warning'),
 info: (message) => addToast(message, 'info'),
 };

 return (
 <ToastContext.Provider value={toastApi}>
 {children}
 <ToastContainer toasts={toasts} onRemove={removeToast} />
 </ToastContext.Provider>
 );
}

export function useToast() {
 const context = useContext(ToastContext);

 if (!context) {
 throw new Error('useToast must be used within ToastProvider');
 }

 return context;
}

function ToastContainer({ toasts, onRemove }) {
 if (toasts.length === 0) {
 return null;
 }

 const icons = {
 success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />,
 error: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
 warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
 info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
 };

 const bgColors = {
 success: 'bg-green-50 border-green-200',
 error: 'bg-red-50 border-red-200',
 warning: 'bg-amber-50 border-amber-200',
 info: 'bg-blue-50 border-blue-200',
 };

 return (
 <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
 {toasts.map((toast) => (
 <div
 key={toast.id}
 className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-lg animate-[slideInRight_0.3s_ease-out] ${bgColors[toast.type] || bgColors.info}`}
 >
 {icons[toast.type] || icons.info}
 <p className="text-sm text-[var(--text-primary)] flex-1">{toast.message}</p>
 <button onClick={() => onRemove(toast.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 <style>{`
 @keyframes slideInRight {
 from { transform: translateX(100%); opacity: 0; }
 to { transform: translateX(0); opacity: 1; }
 }
 `}</style>
 </div>
 );
}
