import { useState, useMemo, useCallback } from 'react';
import {
 Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
 Download, FileSpreadsheet, FileText, Printer, Columns3,
 Trash2, Edit3, Eye, ChevronsUpDown, X, FileDown,
} from 'lucide-react';
import { SkeletonTable } from './Skeleton';
import { exportCSV, exportExcel, flattenForExport } from '../../lib/exportUtils';

/**
 * Universal DataTable component with search, sort, pagination,
 * row selection, bulk actions, column visibility, export, and skeleton loading.
 *
 * Props:
 * columns: [{ key, label, sortable?, hidden?, render?, width?, align? }]
 * data: array of row objects
 * loading: boolean
 * title?: string
 * onRowClick?: (row) => void
 * rowActions?: [{ icon, label, onClick, color?, show? }]
 * bulkActions?: [{ label, icon?, onClick, color? }]
 * emptyMessage?: string
 * emptyIcon?: component
 * exportFilename?: string
 * pageSizes?: number[]
 * defaultPageSize?: number
 * searchPlaceholder?: string
 * compact?: boolean
 */
export default function DataTable({
 columns: initialColumns,
 data = [],
 loading = false,
 title,
 onRowClick,
 rowActions = [],
 bulkActions = [],
 emptyMessage = 'No data found.',
 emptyIcon: EmptyIcon,
 exportFilename = 'export',
 pageSizes = [25, 50, 100],
 defaultPageSize = 25,
 searchPlaceholder = 'Search...',
 compact = false,
}) {
 const [search, setSearch] = useState('');
 const [sortKey, setSortKey] = useState(null);
 const [sortDir, setSortDir] = useState('asc');
 const [page, setPage] = useState(0);
 const [pageSize, setPageSize] = useState(defaultPageSize);
 const [selected, setSelected] = useState(new Set());
 const [hiddenCols, setHiddenCols] = useState(new Set());
 const [showColPicker, setShowColPicker] = useState(false);
 const [showExport, setShowExport] = useState(false);

 const columns = useMemo(
 () => initialColumns.filter(c => !hiddenCols.has(c.key)),
 [initialColumns, hiddenCols],
 );

 // Search across all visible columns
 const filtered = useMemo(() => {
 if (!search.trim()) return data;
 const q = search.toLowerCase();
 return data.filter(row =>
 columns.some(col => {
 const val = row[col.key];
 if (val == null) return false;
 return String(val).toLowerCase().includes(q);
 }),
 );
 }, [data, search, columns]);

 // Sort
 const sorted = useMemo(() => {
 if (!sortKey) return filtered;
 return [...filtered].sort((a, b) => {
 let va = a[sortKey] ?? '';
 let vb = b[sortKey] ?? '';
 // Handle Firestore timestamps
 if (va && typeof va === 'object' && typeof va.toDate === 'function') va = va.toDate().getTime();
 if (vb && typeof vb === 'object' && typeof vb.toDate === 'function') vb = vb.toDate().getTime();
 if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
 return sortDir === 'asc'
 ? String(va).localeCompare(String(vb))
 : String(vb).localeCompare(String(va));
 });
 }, [filtered, sortKey, sortDir]);

 // Paginate
 const totalPages = Math.ceil(sorted.length / pageSize) || 1;
 const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

 // Clamp page
 if (page >= totalPages && page > 0) setPage(totalPages - 1);

 const handleSort = useCallback((key) => {
 if (sortKey === key) {
 setSortDir(d => d === 'asc' ? 'desc' : 'asc');
 } else {
 setSortKey(key);
 setSortDir('asc');
 }
 }, [sortKey]);

 const toggleAll = () => {
 if (selected.size === paginated.length) {
 setSelected(new Set());
 } else {
 setSelected(new Set(paginated.map(r => r.id)));
 }
 };

 const toggleRow = (id) => {
 const next = new Set(selected);
 next.has(id) ? next.delete(id) : next.add(id);
 setSelected(next);
 };

 const handleExport = (type) => {
 setShowExport(false);
 const exportCols = initialColumns.filter(c => !hiddenCols.has(c.key));
 const exportData = flattenForExport(sorted, exportCols);
 if (type === 'csv') exportCSV(exportData, exportFilename);
 else if (type === 'excel') exportExcel(exportData, exportFilename);
 else if (type === 'print') window.print();
 };

 const selectedRows = data.filter(r => selected.has(r.id));

 if (loading) {
 return (
 <div className="card p-0 overflow-hidden">
 <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-primary)]">
 {title && <div className="skeleton-shimmer h-5 w-40 rounded" />}
 <div className="skeleton-shimmer h-9 w-48 rounded-lg ml-auto" />
 </div>
 <SkeletonTable rows={5} cols={initialColumns.length > 6 ? 6 : initialColumns.length} />
 </div>
 );
 }

 return (
 <div className="card p-0 overflow-hidden">
 {/* Toolbar */}
 <div className="px-5 py-3 flex items-center gap-3 border-b border-[var(--border-primary)] flex-wrap">
 {title && <h2 className="text-base font-semibold text-[var(--text-primary)] mr-auto">{title}</h2>}

 {/* Search */}
 <div className="relative">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
 <input
 type="text"
 placeholder={searchPlaceholder}
 value={search}
 onChange={e => { setSearch(e.target.value); setPage(0); }}
 className="pl-8 pr-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white s:bg-gray-700 transition-all w-52 "
 />
 {search && (
 <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
 <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
 </button>
 )}
 </div>

 {!title && <div className="flex-1" />}

 {/* Column picker */}
 <div className="relative">
 <button onClick={() => setShowColPicker(p => !p)}
 className="p-1.5 rounded-lg border border-[var(--border-primary)] hover:bg-gray-50 sition-colors"
 title="Toggle columns">
 <Columns3 className="w-4 h-4 text-[var(--text-muted)]" />
 </button>
 {showColPicker && (
 <>
 <div className="fixed inset-0 z-30" onClick={() => setShowColPicker(false)} />
 <div className="absolute right-0 top-10 bg-[var(--bg-card)] shadow-xl border border-[var(--border-primary)] rounded-xl p-3 z-40 w-52 space-y-1">
 <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Show/Hide Columns</p>
 {initialColumns.map(col => (
 <label key={col.key} className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer py-1 hover:bg-gray-50 ">
 <input
 type="checkbox"
 checked={!hiddenCols.has(col.key)}
 onChange={() => {
 const next = new Set(hiddenCols);
 next.has(col.key) ? next.delete(col.key) : next.add(col.key);
 setHiddenCols(next);
 }}
 className="rounded accent-teal-600"
 />
 {col.label}
 </label>
 ))}
 </div>
 </>
 )}
 </div>

 {/* Export */}
 <div className="relative">
 <button onClick={() => setShowExport(p => !p)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-primary)] hover:bg-gray-50 sm font-medium text-gray-600 transition-colors"
 title="Export data">
 <FileDown className="w-3.5 h-3.5" /> Export
 </button>
 {showExport && (
 <>
 <div className="fixed inset-0 z-30" onClick={() => setShowExport(false)} />
 <div className="absolute right-0 top-10 bg-[var(--bg-card)] shadow-xl border border-[var(--border-primary)] rounded-xl py-1.5 z-40 w-44">
 <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-gray-50 ">
 <FileText className="w-4 h-4" /> Export CSV
 </button>
 <button onClick={() => handleExport('excel')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-gray-50 ">
 <FileSpreadsheet className="w-4 h-4" /> Export Excel
 </button>
 <button onClick={() => handleExport('print')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-gray-50 ">
 <Printer className="w-4 h-4" /> Print / PDF
 </button>
 </div>
 </>
 )}
 </div>

 <span className="text-xs text-[var(--text-muted)]">{sorted.length} results</span>
 </div>

 {/* Bulk Action Bar */}
 {selected.size > 0 && bulkActions.length > 0 && (
 <div className="px-5 py-2.5 bg-teal-50 s-center gap-3">
 <span className="text-sm font-semibold text-teal-700 ">{selected.size} selected</span>
 <div className="flex gap-2 ml-4">
 {bulkActions.map((action, i) => {
 const Icon = action.icon;
 return (
 <button key={i} onClick={() => action.onClick(selectedRows)}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
 action.color === 'red'
 ? 'text-red-600 bg-red-50 hover:bg-red-100 '
 : 'text-teal-700 bg-teal-100 hover:bg-teal-200 '
 }`}>
 {Icon && <Icon className="w-3.5 h-3.5" />} {action.label}
 </button>
 );
 })}
 </div>
 <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-[var(--text-muted)] hover:text-gray-700 ">
 Clear
 </button>
 </div>
 )}

 {/* Table */}
 <div className="overflow-x-auto" data-export-table>
 <table className="w-full">
 <thead>
 <tr className="bg-[var(--bg-secondary)]/50">
 {bulkActions.length > 0 && (
 <th className="table-header w-10">
 <input type="checkbox" checked={paginated.length > 0 && selected.size === paginated.length}
 onChange={toggleAll} className="rounded accent-teal-600" />
 </th>
 )}
 {columns.map(col => (
 <th key={col.key}
 className={`table-header ${col.sortable !== false ? 'cursor-pointer select-none hover:bg-gray-100 ' : ''}`}
 style={{ width: col.width, textAlign: col.align || 'left' }}
 onClick={() => col.sortable !== false && handleSort(col.key)}>
 <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
 {col.label}
 {sortKey === col.key ? (
 sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
 ) : col.sortable !== false ? (
 <ChevronsUpDown className="w-3 h-3 text-gray-300" />
 ) : null}
 </div>
 </th>
 ))}
 {rowActions.length > 0 && <th className="table-header w-20 text-center">Actions</th>}
 </tr>
 </thead>
 <tbody>
 {paginated.length === 0 ? (
 <tr>
 <td colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}
 className="text-center py-16">
 <div className="flex flex-col items-center gap-3">
 {EmptyIcon && <EmptyIcon className="w-12 h-12 text-gray-300 " />}
 <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>
 </div>
 </td>
 </tr>
 ) : (
 paginated.map(row => (
 <tr key={row.id}
 className={`group hover:bg-gray-50 sition-colors ${
 selected.has(row.id) ? 'bg-teal-50/50 ' : ''
 } ${onRowClick ? 'cursor-pointer' : ''}`}
 onClick={() => onRowClick && onRowClick(row)}>
 {bulkActions.length > 0 && (
 <td className="table-cell w-10" onClick={e => e.stopPropagation()}>
 <input type="checkbox" checked={selected.has(row.id)}
 onChange={() => toggleRow(row.id)} className="rounded accent-teal-600" />
 </td>
 )}
 {columns.map(col => (
 <td key={col.key} className={`table-cell ${compact ? 'py-2' : ''}`}
 style={{ textAlign: col.align || 'left' }}>
 {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
 </td>
 ))}
 {rowActions.length > 0 && (
 <td className="table-cell text-center" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 {rowActions.filter(a => !a.show || a.show(row)).map((action, i) => {
 const Icon = action.icon;
 return (
 <button key={i} onClick={() => action.onClick(row)}
 title={action.label}
 className={`p-1.5 rounded-lg hover:bg-gray-100 sition-colors ${
 action.color === 'red' ? 'text-red-500' : action.color === 'green' ? 'text-green-500' : 'text-[var(--text-muted)]'
 }`}>
 <Icon className="w-3.5 h-3.5" />
 </button>
 );
 })}
 </div>
 </td>
 )}
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {sorted.length > pageSizes[0] && (
 <div className="px-5 py-3 flex items-center justify-between border-t border-[var(--border-primary)]">
 <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
 Rows per page:
 <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
 className="bg-transparent border border-[var(--border-primary)] rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500 ">
 {pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
 </select>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs text-[var(--text-muted)]">
 {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
 </span>
 <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
 className="p-1 rounded hover:bg-gray-100 sabled:opacity-30 disabled:cursor-not-allowed transition-colors">
 <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
 </button>
 <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
 className="p-1 rounded hover:bg-gray-100 sabled:opacity-30 disabled:cursor-not-allowed transition-colors">
 <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
