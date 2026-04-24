/**
 * Reusable Skeleton Loading Components
 * Shimmer animation applied via CSS class .skeleton-shimmer
 */

export function Skeleton({ className = '', style }) {
 return <div className={`skeleton-shimmer rounded ${className}`} style={style} />;
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
 return (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr>
 {Array.from({ length: cols }).map((_, i) => (
 <th key={i} className="table-header">
 <Skeleton className="h-3 w-16" />
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {Array.from({ length: rows }).map((_, r) => (
 <tr key={r}>
 {Array.from({ length: cols }).map((_, c) => (
 <td key={c} className="table-cell">
 {c === 0 ? (
 <div className="flex items-center gap-3">
 <Skeleton className="w-8 h-8 rounded-full" />
 <Skeleton className="h-3 w-24" />
 </div>
 ) : c === cols - 1 ? (
 <Skeleton className="h-5 w-14 rounded-full" />
 ) : (
 <Skeleton className={`h-3 ${c % 2 === 0 ? 'w-20' : 'w-16'}`} />
 )}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}

export function SkeletonCard() {
 return (
 <div className="card">
 <Skeleton className="h-3 w-24 mb-3" />
 <Skeleton className="h-8 w-16 mb-2" />
 <Skeleton className="h-3 w-20" />
 </div>
 );
}

export function SkeletonCards({ count = 4 }) {
 return (
 <div className="grid grid-cols-4 gap-5">
 {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
 </div>
 );
}

export function SkeletonChart({ height = 250 }) {
 return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

export function SkeletonForm({ fields = 4 }) {
 return (
 <div className="space-y-4">
 {Array.from({ length: fields }).map((_, i) => (
 <div key={i}>
 <Skeleton className="h-3 w-20 mb-2" />
 <Skeleton className="h-10 w-full rounded-lg" />
 </div>
 ))}
 </div>
 );
}

export function SkeletonKanban({ columns = 4 }) {
 return (
 <div className="flex gap-4 overflow-hidden">
 {Array.from({ length: columns }).map((_, i) => (
 <div key={i} className="flex-shrink-0 w-72 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
 <div className="flex items-center gap-2 mb-4 px-1">
 <Skeleton className="w-2.5 h-2.5 rounded-full" />
 <Skeleton className="h-3 w-20" />
 <Skeleton className="h-4 w-6 rounded-full ml-auto" />
 </div>
 {Array.from({ length: 3 - i % 2 }).map((_, j) => (
 <div key={j} className="bg-white rounded-lg border border-gray-100 p-3 mb-2.5 shadow-sm">
 <Skeleton className="h-3 w-3/4 mb-2" />
 <Skeleton className="h-2.5 w-1/2 mb-3" />
 <div className="flex items-center gap-2">
 <Skeleton className="w-5 h-5 rounded-full" />
 <Skeleton className="h-2 w-16" />
 </div>
 </div>
 ))}
 </div>
 ))}
 </div>
 );
}

export function SkeletonCalendar() {
 return (
 <div>
 <div className="flex items-center justify-between mb-4">
 <Skeleton className="h-5 w-32" />
 <div className="flex gap-2">
 <Skeleton className="h-7 w-7 rounded-lg" />
 <Skeleton className="h-7 w-7 rounded-lg" />
 </div>
 </div>
 <div className="grid grid-cols-7 gap-1.5 mb-1.5">
 {Array.from({ length: 7 }).map((_, i) => (
 <Skeleton key={i} className="h-3 w-8 mx-auto" />
 ))}
 </div>
 <div className="grid grid-cols-7 gap-1.5">
 {Array.from({ length: 35 }).map((_, i) => (
 <Skeleton key={i} className="h-24 rounded-lg" />
 ))}
 </div>
 </div>
 );
}

export function SkeletonTimeline({ items = 5 }) {
 return (
 <div className="space-y-4">
 {Array.from({ length: items }).map((_, i) => (
 <div key={i} className="flex items-start gap-3">
 <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
 <div className="flex-1">
 <Skeleton className="h-3 w-3/4 mb-2" />
 <Skeleton className="h-2.5 w-1/3" />
 </div>
 </div>
 ))}
 </div>
 );
}

// ✅ Fix P20: Static Tailwind grid class map — dynamic grid-cols-${count} would be purged in production
export function SkeletonStatCards({ count = 4 }) {
 const gridMap = {
 1: 'grid-cols-1',
 2: 'grid-cols-2',
 3: 'grid-cols-3',
 4: 'grid-cols-4',
 5: 'grid-cols-5',
 6: 'grid-cols-6',
 };
 return (
 <div className={`grid ${gridMap[count] || 'grid-cols-4'} gap-5`}>
 {Array.from({ length: count }).map((_, i) => (
 <div key={i} className="card flex items-center gap-4">
 <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
 <div className="flex-1">
 <Skeleton className="h-2.5 w-20 mb-2" />
 <Skeleton className="h-6 w-12 mb-1" />
 <Skeleton className="h-2 w-16" />
 </div>
 </div>
 ))}
 </div>
 );
}

export function SkeletonDashboard() {
 return (
 <div className="space-y-6 animate-pulse">
 <SkeletonStatCards count={4} />
 <div className="grid grid-cols-2 gap-5">
 <SkeletonChart height={300} />
 <SkeletonChart height={300} />
 </div>
 <SkeletonTable rows={5} cols={6} />
 </div>
 );
}
