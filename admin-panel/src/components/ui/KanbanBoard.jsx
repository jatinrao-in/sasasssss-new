import { useState, useRef, useCallback } from 'react';

export default function KanbanBoard({ columns = [], items = [], renderCard, onDrop, getColumnColor }) {
 const [dragging, setDragging] = useState(null);
 const [dropTarget, setDropTarget] = useState(null);
 const dragRef = useRef(null);

 const handleDragStart = useCallback((e, item) => {
 setDragging(item);
 dragRef.current = item;
 e.dataTransfer.effectAllowed = 'move';
 e.dataTransfer.setData('text/plain', item.id);
 // Add drag ghost styling
 e.target.style.opacity = '0.5';
 }, []);

 const handleDragEnd = useCallback((e) => {
 e.target.style.opacity = '1';
 setDragging(null);
 setDropTarget(null);
 dragRef.current = null;
 }, []);

 const handleDragOver = useCallback((e, colId) => {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 setDropTarget(colId);
 }, []);

 const handleDragLeave = useCallback(() => {
 setDropTarget(null);
 }, []);

 const handleDrop = useCallback((e, colId) => {
 e.preventDefault();
 setDropTarget(null);
 if (dragRef.current && onDrop) {
 onDrop(dragRef.current, colId);
 }
 setDragging(null);
 dragRef.current = null;
 }, [onDrop]);

 const defaultColors = {
 0: { bg: 'bg-blue-50', border: 'border-blue-200', header: 'text-blue-700', dot: 'bg-blue-400' },
 1: { bg: 'bg-amber-50', border: 'border-amber-200', header: 'text-amber-700', dot: 'bg-amber-400' },
 2: { bg: 'bg-purple-50', border: 'border-purple-200', header: 'text-purple-700', dot: 'bg-purple-400' },
 3: { bg: 'bg-green-50', border: 'border-green-200', header: 'text-green-700', dot: 'bg-green-400' },
 4: { bg: 'bg-red-50', border: 'border-red-200', header: 'text-red-700', dot: 'bg-red-400' },
 5: { bg: 'bg-gray-50', border: 'border-gray-200', header: 'text-gray-700', dot: 'bg-gray-400' },
 };

 return (
 <div className="flex gap-4 overflow-x-auto pb-4 kanban-container" style={{ minHeight: '400px' }}>
 {columns.map((col, index) => {
 const colItems = items.filter(item => item.status === col.id || item.column === col.id);
 const colors = (getColumnColor && getColumnColor(col.id)) || defaultColors[index % 6];
 const isDropping = dropTarget === col.id;

 return (
 <div
 key={col.id}
 className={`kanban-column flex-shrink-0 w-72 rounded-xl border-2 transition-all duration-200 ${
 isDropping
 ? `${colors.border} ${colors.bg} shadow-lg scale-[1.01]`
 : 'border-gray-100 bg-gray-50/50'
 }`}
 onDragOver={(e) => handleDragOver(e, col.id)}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, col.id)}
 >
 {/* Column Header */}
 <div className="px-4 py-3 border-b border-gray-100">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
 <h3 className={`text-sm font-semibold ${colors.header}`}>{col.label}</h3>
 </div>
 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.header}`}>
 {colItems.length}
 </span>
 </div>
 </div>

 {/* Column Body */}
 <div className="p-3 space-y-2.5 min-h-[200px] max-h-[600px] overflow-y-auto">
 {colItems.length === 0 ? (
 <div className="text-center py-8 text-gray-300 text-xs">
 Drop items here
 </div>
 ) : (
 colItems.map(item => (
 <div
 key={item.id}
 draggable
 onDragStart={(e) => handleDragStart(e, item)}
 onDragEnd={handleDragEnd}
 className={`kanban-card bg-[var(--bg-card)] rounded-lg border border-gray-100 p-3 shadow-sm 
 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5
 transition-all duration-150 ${
 dragging?.id === item.id ? 'opacity-50 scale-95' : ''
 }`}
 >
 {renderCard ? renderCard(item) : (
 <div>
 <p className="text-sm font-medium text-gray-800">{item.title || item.name}</p>
 {item.subtitle && (
 <p className="text-xs text-gray-400 mt-1">{item.subtitle}</p>
 )}
 </div>
 )}
 </div>
 ))
 )}
 </div>
 </div>
 );
 })}
 </div>
 );
}
