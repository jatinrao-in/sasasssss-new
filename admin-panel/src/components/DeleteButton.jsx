import { Trash2 } from 'lucide-react';

export default function DeleteButton({
  onClick,
  label = 'Delete',
  title = 'Delete',
  className = '',
  disabled = false,
  showLabel = true,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={className}
      style={{
        background: 'transparent',
        border: '1px solid #DC2626',
        color: '#DC2626',
        borderRadius: '6px',
        padding: showLabel ? '6px 8px' : '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        fontSize: '13px',
        fontWeight: 500,
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(event) => {
        if (!disabled) event.currentTarget.style.background = '#FEE2E2';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <Trash2 size={14} />
      {showLabel && label}
    </button>
  );
}
