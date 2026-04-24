import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportCSV, exportExcel, flattenForExport } from '../../lib/exportUtils';

export default function ExportButton({ data, columns, filename = 'export' }) {
 const [open, setOpen] = useState(false);
 const ref = useRef(null);

 useEffect(() => {
 const handler = (e) => {
 if (ref.current && !ref.current.contains(e.target)) setOpen(false);
 };
 document.addEventListener('mousedown', handler);
 return () => document.removeEventListener('mousedown', handler);
 }, []);

 const handleExport = (format) => {
 const flat = columns ? flattenForExport(data, columns) : data;
 if (format === 'csv') exportCSV(flat, filename);
 else exportExcel(flat, filename);
 setOpen(false);
 };

 if (!data || data.length === 0) return null;

 return (
 <div className="relative" ref={ref}>
 <button
 onClick={() => setOpen(!open)}
 className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-gray-100 transition-all"
 >
 <Download className="w-3.5 h-3.5" /> Export
 </button>
 {open && (
 <div className="export-menu bg-[var(--bg-card)] border border-[var(--border-primary)] py-1.5">
 <button
 onClick={() => handleExport('csv')}
 className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
 >
 <FileText className="w-3.5 h-3.5 text-green-500" /> Export CSV
 </button>
 <button
 onClick={() => handleExport('excel')}
 className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
 >
 <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" /> Export Excel
 </button>
 </div>
 )}
 </div>
 );
}
