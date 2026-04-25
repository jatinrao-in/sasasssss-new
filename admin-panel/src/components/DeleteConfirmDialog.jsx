import * as Dialog from '@radix-ui/react-dialog';
import { Trash2, X } from 'lucide-react';

const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isDeleting,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[80] bg-black/40 modal-overlay"
          aria-hidden="true"
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[90] w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 p-6 shadow-2xl modal-content"
          style={{
            background: 'var(--bg-modal)',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
          }}
        >
          <Dialog.Close asChild>
            <button
              type="button"
              disabled={isDeleting}
              className="absolute right-3 top-3 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </Dialog.Close>

          <div>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#DC2626',
              }}
            >
              <Trash2 size={24} />
            </div>
            <Dialog.Title
              style={{
                color: 'var(--text-primary)',
                textAlign: 'center',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              {title || 'Delete Confirmation'}
            </Dialog.Title>
            <Dialog.Description
              style={{
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginTop: '8px',
                lineHeight: 1.5,
              }}
            >
              {description || 'Are you sure you want to delete this? This action cannot be undone.'}
            </Dialog.Description>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#DC2626',
                color: 'white',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                opacity: isDeleting ? 0.7 : 1,
              }}
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default DeleteConfirmDialog;
