const RANK_STYLES = {
  1: { background: '#FFD700', color: '#000' },
  2: { background: '#C0C0C0', color: '#000' },
  3: { background: '#CD7F32', color: '#fff' },
};

const PROJECT_HEALTH_META = {
  'on-track': {
    label: 'On Track',
    color: '#16A34A',
    background: '#f0fdf4',
    border: '#bbf7d0',
    textClass: 'text-green-600',
  },
  'at-risk': {
    label: 'At Risk',
    color: '#D97706',
    background: '#fffbeb',
    border: '#fde68a',
    textClass: 'text-amber-600',
  },
  critical: {
    label: 'Critical',
    color: '#DC2626',
    background: '#fef2f2',
    border: '#fecaca',
    textClass: 'text-red-600',
  },
};

export function RankBadge({ rank, style = {}, className = '' }) {
  const rankStyle = RANK_STYLES[rank] || {
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
  };

  return (
    <span
      className={className}
      style={{
        background: rankStyle.background,
        color: rankStyle.color,
        padding: '2px 8px',
        borderRadius: '4px',
        fontWeight: 'bold',
        fontSize: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '34px',
        ...style,
      }}
    >
      #{rank}
    </span>
  );
}

export function StatusDot({ label, color, style = {}, className = '' }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...style,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </span>
  );
}

export function StatusPill({ label, color, background, borderColor, className = '' }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 8px',
        borderRadius: '999px',
        background,
        border: `1px solid ${borderColor || background}`,
        color,
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </span>
  );
}

export function getProjectHealthMeta(status) {
  return PROJECT_HEALTH_META[status] || PROJECT_HEALTH_META['at-risk'];
}
