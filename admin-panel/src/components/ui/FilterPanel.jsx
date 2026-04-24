import { useState } from 'react';
import { ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react';

export default function FilterPanel({ filters = [], values = {}, onChange, onReset, children }) {
 const [isOpen, setIsOpen] = useState(false);

 const activeCount = Object.values(values).filter(v => v && v !== 'All' && v !== '' && !(Array.isArray(v) && v.length === 0)).length;

 return (
 <div className="card py-3 px-4">
 <div className="flex items-center justify-between">
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
 >
 {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
 Advanced Filters
 {activeCount > 0 && (
 <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
 {activeCount}
 </span>
 )}
 </button>
 {activeCount > 0 && (
 <button
 onClick={onReset}
 className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
 >
 <RotateCcw className="w-3 h-3" /> Clear All
 </button>
 )}
 </div>

 {isOpen && (
 <div className="mt-4 pt-3 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {filters.map(filter => (
 <div key={filter.key}>
 <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">{filter.label}</label>
 {filter.type === 'select' && (
 <select
 className="input-field text-sm"
 value={values[filter.key] || 'All'}
 onChange={e => onChange(filter.key, e.target.value)}
 >
 <option value="All">All {filter.label}</option>
 {(filter.options || []).map(opt => (
 <option key={opt.value || opt} value={opt.value || opt}>
 {opt.label || opt}
 </option>
 ))}
 </select>
 )}
 {filter.type === 'date' && (
 <input
 type="date"
 className="input-field text-sm"
 value={values[filter.key] || ''}
 onChange={e => onChange(filter.key, e.target.value)}
 />
 )}
 {filter.type === 'dateRange' && (
 <div className="flex gap-2">
 <input
 type="date"
 className="input-field text-sm flex-1"
 placeholder="From"
 value={values[`${filter.key}_from`] || ''}
 onChange={e => onChange(`${filter.key}_from`, e.target.value)}
 />
 <input
 type="date"
 className="input-field text-sm flex-1"
 placeholder="To"
 value={values[`${filter.key}_to`] || ''}
 onChange={e => onChange(`${filter.key}_to`, e.target.value)}
 />
 </div>
 )}
 {filter.type === 'range' && (
 <div className="flex items-center gap-2">
 <input
 type="number"
 className="input-field text-sm flex-1"
 placeholder="Min"
 value={values[`${filter.key}_min`] || ''}
 onChange={e => onChange(`${filter.key}_min`, e.target.value)}
 />
 <span className="text-gray-300">–</span>
 <input
 type="number"
 className="input-field text-sm flex-1"
 placeholder="Max"
 value={values[`${filter.key}_max`] || ''}
 onChange={e => onChange(`${filter.key}_max`, e.target.value)}
 />
 </div>
 )}
 {filter.type === 'multiSelect' && (
 <div className="flex flex-wrap gap-1.5 mt-1">
 {(filter.options || []).map(opt => {
 const val = opt.value || opt;
 const label = opt.label || opt;
 const selected = (values[filter.key] || []).includes(val);
 return (
 <button
 key={val}
 onClick={() => {
 const current = values[filter.key] || [];
 const next = selected ? current.filter(v => v !== val) : [...current, val];
 onChange(filter.key, next);
 }}
 className={`px-2 py-1 rounded-md text-xs font-medium border transition-all ${
 selected
 ? 'bg-teal-50 border-teal-300 text-teal-700'
 : 'bg-white border-[var(--border-primary)] text-[var(--text-muted)] hover:border-gray-300'
 }`}
 >
 {label}
 </button>
 );
 })}
 </div>
 )}
 </div>
 ))}
 </div>
 {children && <div className="mt-3 pt-3 border-t border-gray-50">{children}</div>}
 </div>
 )}
 </div>
 );
}
