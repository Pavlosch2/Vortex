import React from 'react';

export default function UserHeaderBadge({ dark, profile, onOpenProfile }) {
  if (!profile) return null;

  const bg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const border = dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(132,139,200,0.2)';
  const textColor = dark ? '#edeffd' : '#363949';

  return (
    <div
      onClick={onOpenProfile}
      title="Переглянути профіль"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '4px 10px 4px 4px',
        borderRadius: '0.75rem',
        background: bg,
        border,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(108,155,207,0.1)'}
      onMouseLeave={e => e.currentTarget.style.background = bg}
    >
      <div style={{
        width: '26px',
        height: '26px',
        borderRadius: '0.45rem',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg, #6c9bcf, #1B9c85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '0.72rem',
        fontWeight: 700,
      }}>
        {profile.avatar
          ? <img src={profile.avatar} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : profile.username?.[0]?.toUpperCase()
        }
      </div>
      <span style={{
        fontSize: '0.8rem',
        fontWeight: 600,
        color: textColor,
        fontFamily: 'Poppins, sans-serif',
        maxWidth: '100px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {profile.username}
      </span>
    </div>
  );
}