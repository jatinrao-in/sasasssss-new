import { Inbox, Search, FileX, Plus, FolderOpen } from 'lucide-react';

const icons = {
 noData: Inbox,
 noResults: Search,
 noFile: FileX,
 empty: FolderOpen,
};

export default function EmptyState({
 icon = 'noData',
 title = 'No data found',
 description = '',
 actionLabel,
 onAction,
 compact = false,
}) {
 const Icon = typeof icon === 'string' ? (icons[icon] || Inbox) : icon;

 return (
 <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}>
 <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-2xl bg-gray-100 flex items-center justify-center mb-4`}>
 <Icon className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-gray-300`} />
 </div>
 <h3 className={`font-semibold text-gray-400 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
 {description && (
 <p className="text-xs text-gray-300 mt-1 max-w-xs">{description}</p>
 )}
 {actionLabel && onAction && (
 <button
 onClick={onAction}
 className="mt-4 btn-primary text-xs"
 >
 <Plus className="w-3.5 h-3.5" /> {actionLabel}
 </button>
 )}
 </div>
 );
}
