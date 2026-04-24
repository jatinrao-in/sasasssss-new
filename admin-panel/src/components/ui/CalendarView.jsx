import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year, month) {
 return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
 return new Date(year, month, 1).getDay();
}

function isSameDay(d1, d2) {
 if (!d1 || !d2) return false;
 return d1.getFullYear() === d2.getFullYear() &&
 d1.getMonth() === d2.getMonth() &&
 d1.getDate() === d2.getDate();
}

function normalizeDate(value) {
 if (!value) return null;
 if (typeof value.toDate === 'function') return value.toDate();
 const d = new Date(value);
 return isNaN(d.getTime()) ? null : d;
}

export default function CalendarView({ items = [], dateField = 'targetDate', onDayClick, renderDayContent, getItemColor }) {
 const today = new Date();
 const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

 const year = viewDate.getFullYear();
 const month = viewDate.getMonth();
 const daysInMonth = getDaysInMonth(year, month);
 const firstDay = getFirstDayOfMonth(year, month);

 const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
 const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
 const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

 const itemsByDay = useMemo(() => {
 const map = {};
 items.forEach(item => {
 const d = normalizeDate(item[dateField]);
 if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
 const day = d.getDate();
 if (!map[day]) map[day] = [];
 map[day].push(item);
 });
 return map;
 }, [items, dateField, year, month]);

 const cells = [];

 // Empty cells for days before the first of the month
 for (let i = 0; i < firstDay; i++) {
 cells.push(<div key={`empty-${i}`} className="calendar-cell-empty h-24 bg-gray-50/30 rounded-lg" />);
 }

 for (let day = 1; day <= daysInMonth; day++) {
 const dayItems = itemsByDay[day] || [];
 const isToday = isSameDay(new Date(year, month, day), today);
 const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

 const overdueCount = dayItems.filter(i => i.status === 'overdue' || i.overdueDays > 0).length;
 const openCount = dayItems.filter(i => i.status === 'open' || i.status === 'pending').length;
 const closedCount = dayItems.filter(i => i.status === 'closed' || i.status === 'completed').length;

 cells.push(
 <div
 key={day}
 onClick={() => onDayClick && onDayClick(day, dayItems)}
 className={`calendar-cell relative h-24 rounded-lg border p-1.5 transition-all duration-150 cursor-pointer
 ${isToday ? 'border-teal-400 bg-teal-50/50 ring-1 ring-teal-200' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'}
 ${dayItems.length > 0 ? 'hover:shadow-sm' : ''}
 `}
 >
 <div className="flex items-center justify-between mb-1">
 <span className={`text-xs font-semibold leading-none ${
 isToday ? 'text-teal-700 bg-teal-100 w-5 h-5 rounded-full flex items-center justify-center' :
 isPast ? 'text-gray-300' : 'text-gray-600'
 }`}>
 {day}
 </span>
 {dayItems.length > 0 && (
 <span className="text-[10px] font-bold text-gray-400">{dayItems.length}</span>
 )}
 </div>

 {renderDayContent ? renderDayContent(day, dayItems) : (
 <div className="space-y-0.5">
 {dayItems.slice(0, 3).map((item, idx) => {
 const color = getItemColor
 ? getItemColor(item)
 : item.status === 'overdue' ? 'bg-red-400'
 : item.status === 'completed' || item.status === 'closed' ? 'bg-green-400'
 : 'bg-blue-400';
 return (
 <div key={item.id || idx} className="flex items-center gap-1 min-w-0">
 <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
 <span className="text-[10px] text-[var(--text-muted)] truncate leading-tight">
 {item.customerName || item.title || item.taskType || 'Item'}
 </span>
 </div>
 );
 })}
 {dayItems.length > 3 && (
 <span className="text-[9px] text-gray-400 font-medium">+{dayItems.length - 3} more</span>
 )}
 </div>
 )}

 {/* Status dots */}
 {dayItems.length > 0 && (
 <div className="absolute bottom-1 right-1 flex gap-0.5">
 {overdueCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
 {openCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
 {closedCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
 </div>
 )}
 </div>
 );
 }

 return (
 <div className="calendar-view">
 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <h3 className="text-lg font-bold text-gray-800">
 {MONTH_NAMES[month]} {year}
 </h3>
 <button
 onClick={goToday}
 className="text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded-md hover:bg-teal-50 transition-colors"
 >
 Today
 </button>
 </div>
 <div className="flex items-center gap-1">
 <button
 onClick={prevMonth}
 className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
 >
 <ChevronLeft className="w-4 h-4 text-gray-500" />
 </button>
 <button
 onClick={nextMonth}
 className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
 >
 <ChevronRight className="w-4 h-4 text-gray-500" />
 </button>
 </div>
 </div>

 {/* Day Names */}
 <div className="grid grid-cols-7 gap-1.5 mb-1.5">
 {DAY_NAMES.map(day => (
 <div key={day} className="text-center text-xs font-semibold text-gray-400 py-1.5">
 {day}
 </div>
 ))}
 </div>

 {/* Calendar Grid */}
 <div className="grid grid-cols-7 gap-1.5">
 {cells}
 </div>

 {/* Legend */}
 <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
 <div className="flex items-center gap-1.5 text-xs text-gray-400">
 <div className="w-2 h-2 rounded-full bg-red-400" /> Overdue
 </div>
 <div className="flex items-center gap-1.5 text-xs text-gray-400">
 <div className="w-2 h-2 rounded-full bg-blue-400" /> Open
 </div>
 <div className="flex items-center gap-1.5 text-xs text-gray-400">
 <div className="w-2 h-2 rounded-full bg-green-400" /> Closed
 </div>
 </div>
 </div>
 );
}
