import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './styles/UserHoverCard.css';

const API = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api`;

const ROLE_LABELS = {
  user: 'Користувач',
  manager: 'Менеджер',
  admin: 'Адміністратор',
};
const ROLE_COLORS = {
  user: '#a3bdcc',
  manager: '#6c9bcf',
  admin: '#f7d060',
};

function timeAgo(dateStr) {
  if (!dateStr) return 'невідомо';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'щойно';
  if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн тому`;
  return new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function UserLink({ username, dark, onOpenProfile, children }) {
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const cardRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    if (profile) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/users/${username}/`);
      setProfile(res.data);
    } catch {}
    setLoading(false);
  }, [username, profile]);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setShow(true);
      fetchProfile();
    }, 400);
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(20,22,28,0.98)' : 'rgba(255,255,255,0.98)';
  const borderColor = dark ? 'rgba(255,255,255,0.09)' : 'rgba(132,139,200,0.2)';

  return (
    <span className="ulink-wrap" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <span
        className="ulink"
        style={{ color: '#6c9bcf', cursor: 'pointer', fontWeight: 600 }}
        onClick={() => onOpenProfile && onOpenProfile(username)}
      >
        {children || username}
      </span>

      {show && (
        <div
          ref={cardRef}
          className="uhover-card"
          style={{ background: cardBg, border: `1px solid ${borderColor}` }}
        >
          {loading || !profile ? (
            <div className="uhover-loading" style={{ color: subColor }}>Завантаження...</div>
          ) : (
            <>
              <div className="uhover-top">
                <div className="uhover-avatar">
                  {profile.avatar
                    ? <img src={profile.avatar} alt={profile.username} />
                    : <span>{profile.username?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <div className="uhover-info">
                  <span
                    className="uhover-name"
                    style={{
                      color: profile.profile_color || textColor,
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {profile.plan === 'pro' && <span title="Pro" style={{ fontSize: '0.8em' }}>⚡</span>}
                    {profile.username}
                  </span>
                  <span className="uhover-role" style={{ color: ROLE_COLORS[profile.role] || subColor }}>
                    {ROLE_LABELS[profile.role] || profile.role}
                  </span>
                </div>
              </div>

              <div className="uhover-stats">
                <div className="uhover-stat">
                  <span className="uhover-stat-label" style={{ color: subColor }}>Реєстрація</span>
                  <span className="uhover-stat-val" style={{ color: textColor }}>{formatDate(profile.date_joined)}</span>
                </div>
                <div className="uhover-stat">
                  <span className="uhover-stat-label" style={{ color: subColor }}>Активність</span>
                  <span className="uhover-stat-val" style={{ color: textColor }}>{timeAgo(profile.last_seen)}</span>
                </div>
                <div className="uhover-stat">
                  <span className="uhover-stat-label" style={{ color: subColor }}>Збірок на сайті</span>
                  <span className="uhover-stat-val" style={{ color: textColor }}>{profile.build_count ?? 0}</span>
                </div>
                <div className="uhover-stat">
                  <span className="uhover-stat-label" style={{ color: subColor }}>Повідомлень</span>
                  <span className="uhover-stat-val" style={{ color: textColor }}>{profile.post_count ?? 0}</span>
                </div>
              </div>

              <button
                className="uhover-profile-btn"
                onClick={() => { onOpenProfile && onOpenProfile(username); setShow(false); }}
              >
                Переглянути профіль →
              </button>
            </>
          )}
        </div>
      )}
    </span>
  );
}