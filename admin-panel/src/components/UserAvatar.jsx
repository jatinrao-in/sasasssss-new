import React, { useMemo, useState } from 'react';

export const avatarColors = [
  { bg: '#FF6B6B', text: '#FFFFFF' },
  { bg: '#4ECDC4', text: '#FFFFFF' },
  { bg: '#45B7D1', text: '#FFFFFF' },
  { bg: '#96CEB4', text: '#FFFFFF' },
  { bg: '#FFEAA7', text: '#2D3436' },
  { bg: '#DDA0DD', text: '#FFFFFF' },
  { bg: '#98D8C8', text: '#2D3436' },
  { bg: '#F7DC6F', text: '#2D3436' },
  { bg: '#BB8FCE', text: '#FFFFFF' },
  { bg: '#F0B27A', text: '#FFFFFF' },
];

export function getAvatarColor(identifier = 'default') {
  const normalizedIdentifier = String(identifier || 'default');
  let hash = 0;

  for (let index = 0; index < normalizedIdentifier.length; index += 1) {
    const char = normalizedIdentifier.charCodeAt(index);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  const colorIndex = Math.abs(hash) % avatarColors.length;
  return avatarColors[colorIndex];
}

export function getInitials(name) {
  const trimmedName = String(name || '').trim();

  if (!trimmedName) {
    return '?';
  }

  const parts = trimmedName.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return trimmedName.slice(0, 2).toUpperCase();
}

export default function UserAvatar({
  user,
  size = 36,
  onClick,
  showRing = false,
}) {
  const [pressed, setPressed] = useState(false);
  const isInteractive = typeof onClick === 'function';
  const identifier = user?.uid || user?.id || user?.name || user?.email || 'default';
  const name = user?.name || user?.displayName || user?.email || 'User';
  const color = useMemo(() => getAvatarColor(identifier), [identifier]);
  const initials = useMemo(() => getInitials(name), [name]);
  const fontSize = Math.max(12, size * 0.38);

  const handleKeyDown = (event) => {
    if (!isInteractive) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      aria-label={name}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      role={isInteractive ? 'button' : 'img'}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: color.bg,
        color: color.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1,
        cursor: isInteractive ? 'pointer' : 'default',
        userSelect: 'none',
        flexShrink: 0,
        outline: showRing ? `3px solid ${color.bg}` : 'none',
        outlineOffset: '2px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
        transition: 'transform 0.1s ease, box-shadow 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      tabIndex={isInteractive ? 0 : -1}
    >
      {initials}
    </div>
  );
}
