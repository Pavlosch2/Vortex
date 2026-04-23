import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ArrowLeft, Send, Trash2, Loader, Package } from 'lucide-react';
import './styles/UserProfilePage.css';

const API = 'http://127.0.0.1:8000/api';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });
const getToken = () => localStorage.getItem('vortex_token');

const ROLE_LABELS = { user: 'Користувач', manager: 'Менеджер', admin: 'Адміністратор' };
const ROLE_COLORS = { user: '#a3bdcc', manager: '#6c9bcf', admin: '#f7d060' };

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' });
}
function timeAgo(dateStr) {
  if (!dateStr) return 'невідомо';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'щойно';
  if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн тому`;
  return formatDate(dateStr);
}

export default function UserProfilePage({ username, dark, onBack, onInstall, onAnalyze }) {
  const [profile, setProfile] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState('messages');
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(132,139,200,0.15)';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        axios.get(`${API}/users/${username}/`),
        axios.get(`${API}/users/${username}/messages/`, { headers: getToken() ? auth() : {} }),
      ]);
      setProfile(pRes.data);
      setMessages(mRes.data);
    } catch {}
    setLoading(false);
  }, [username]);

  const loadBuilds = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users/${username}/builds/`);
      setBuilds(res.data);
    } catch {}
  }, [username]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'builds') loadBuilds(); }, [tab, loadBuilds]);

  const sendMessage = async () => {
    const t = msgText.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const res = await axios.post(
        `${API}/users/${username}/messages/`,
        { text: t },
        { headers: auth() },
      );
      setMessages(prev => [res.data, ...prev]);
      setMsgText('');
    } catch {}
    setSending(false);
  };

  const deleteMessage = async (id) => {
    try {
      await axios.delete(`${API}/users/${username}/messages/${id}/`, { headers: auth() });
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  if (loading) return (
    <div className="upp-loading" style={{ color: subColor }}>
      <Loader size={24} className="spin" color="#6c9bcf" />
    </div>
  );

  if (!profile) return (
    <div className="upp-loading" style={{ color: subColor }}>Профіль не знайдено</div>
  );

  const roleColor = ROLE_COLORS[profile.role] || subColor;

  return (
    <div className={`upp-root ${theme}`}>
      <button className="upp-back" style={{ color: subColor }} onClick={onBack}>
        <ArrowLeft size={16} /> Назад
      </button>

      <div className="upp-banner">
        {profile.banner
          ? <img src={profile.banner} alt="banner" className="upp-banner-img" />
          : <div className="upp-banner-empty" />
        }
        <div className="upp-banner-overlay" />
        <div className="upp-banner-content">
          <div className="upp-avatar">
            {profile.avatar
              ? <img src={profile.avatar} alt={profile.username} />
              : <span>{profile.username?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="upp-identity">
            <h2
              className="upp-username"
              style={{
                color: profile.profile_color || '#fff',
                display: 'flex', alignItems: 'center', gap: '6px',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              {profile.plan === 'pro' && <span title="Pro користувач">⚡</span>}
              {profile.username}
            </h2>
            <span className="upp-role" style={{ color: roleColor }}>{ROLE_LABELS[profile.role] || profile.role}</span>
          </div>
        </div>
      </div>

      <div className="upp-stats-row">
        {[
          { label: 'Реєстрація', value: formatDate(profile.date_joined) },
          { label: 'Активність', value: timeAgo(profile.last_seen) },
          { label: 'Збірок', value: profile.build_count ?? 0 },
          { label: 'Повідомлень', value: profile.post_count ?? 0 },
        ].map(s => (
          <div key={s.label} className="upp-stat" style={{ background: cardBg, border }}>
            <span className="upp-stat-label" style={{ color: subColor }}>{s.label}</span>
            <span className="upp-stat-val" style={{ color: textColor }}>{s.value}</span>
          </div>
        ))}
      </div>

      {profile.bio && (
        <div className="upp-bio" style={{ background: cardBg, border, color: subColor }}>
          {profile.bio}
        </div>
      )}

      <div className="upp-tabs">
        {[['messages', '💬 Повідомлення профілю'], ['builds', '📦 Публікації']].map(([id, label]) => (
          <button key={id}
            className={`upp-tab ${tab === id ? 'active' : ''} ${theme}`}
            onClick={() => setTab(id)}
            style={{ color: tab === id ? '#6c9bcf' : subColor }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'messages' && (
        <div className="upp-messages">
          {getToken() && (
            <div className="upp-msg-form" style={{ background: cardBg, border }}>
              <textarea
                className={`upp-msg-input ${theme}`}
                placeholder="Написати повідомлення..."
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                rows={2}
                style={{ color: textColor }}
              />
              <button className="upp-msg-send" disabled={sending || !msgText.trim()} onClick={sendMessage}>
                {sending ? <Loader size={14} className="spin" /> : <Send size={14} />}
              </button>
            </div>
          )}
          {messages.length === 0 ? (
            <p className="upp-empty" style={{ color: subColor }}>Повідомлень ще немає</p>
          ) : (
            messages.map(m => (
              <div key={m.id} className="upp-msg" style={{ background: cardBg, border }}>
                <div className="upp-msg-header">
                  <div className="upp-msg-avatar">
                    {m.author_avatar
                      ? <img src={m.author_avatar} alt={m.author_name} />
                      : <span>{m.author_name?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <span className="upp-msg-author" style={{ color: '#6c9bcf' }}>{m.author_name}</span>
                    <span className="upp-msg-time" style={{ color: subColor }}>
                      {new Date(m.created_at).toLocaleDateString('uk-UA')}
                    </span>
                  </div>
                  {m.is_own && (
                    <button className="upp-msg-delete" onClick={() => deleteMessage(m.id)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="upp-msg-text" style={{ color: textColor }}>{m.text}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'builds' && (
        <div className="upp-builds">
          {builds.length === 0 ? (
            <p className="upp-empty" style={{ color: subColor }}>Публікацій ще немає</p>
          ) : (
            builds.map(b => {
              const cover = b.images?.find(i => i.is_cover) || b.images?.[0];
              return (
                <div key={b.id} className="upp-build" style={{ background: cardBg, border }}>
                  <div className="upp-build-cover">
                    {cover
                      ? <img src={cover.image} alt={b.title} />
                      : <Package size={22} color={subColor} />
                    }
                  </div>
                  <div className="upp-build-info">
                    <span className="upp-build-title" style={{ color: textColor }}>{b.title}</span>
                    <span className="upp-build-meta" style={{ color: subColor }}>
                      ★ {Number(b.rating).toFixed(1)} · {b.review_count} відгуків · ⬇ {b.download_count ?? 0}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}