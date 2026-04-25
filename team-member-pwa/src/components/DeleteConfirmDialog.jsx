import { AlertTriangle, X } from 'lucide-react';

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  loadingLabel = 'Saving...',
  isDeleting = false,
  tone = 'danger',
}) {
  if (!isOpen) {
    return null;
  }

  const toneStyles = tone === 'danger'
    ? {
      badgeBg: '#FEE2E2',
      badgeColor: '#DC2626',
      buttonBg: '#DC2626',
    }
    : {
      badgeBg: '#CCFBF1',
      badgeColor: '#0F766E',
      buttonBg: '#0F766E',
    };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={() => {
          if (!isDeleting) {
            onClose?.();
          }
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <button
          type="button"
          disabled={isDeleting}
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: toneStyles.badgeBg,
            color: toneStyles.badgeColor,
          }}
        >
          <AlertTriangle size={22} />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {title || 'Please confirm'}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {description || 'Are you sure you want to continue?'}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: 'var(--border-primary)',
              background: 'var(--bg-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
            style={{ background: toneStyles.buttonBg }}
          >
            {isDeleting ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
