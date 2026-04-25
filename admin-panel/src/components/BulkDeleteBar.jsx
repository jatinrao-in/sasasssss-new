import { Trash2, X } from 'lucide-react';

export default function BulkDeleteBar({ selectedCount, onDelete, onClear }) {
  if (!selectedCount) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm">
      <span className="font-semibold text-red-700">{selectedCount} items selected</span>
      <button
        type="button"
        onClick={onDelete}
        className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete All
      </button>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg p-1 text-red-500 transition-colors hover:bg-red-100"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
