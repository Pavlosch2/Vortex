import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Cpu, Activity, Database, Monitor, Loader, Camera } from 'lucide-react';
import axios from 'axios';
import './styles/ProfilePanel.css';

const API = 'http://127.0.0.1:8000/api';
const token = () => localStorage.getItem('vortex_token');
const authH = () => ({ Authorization: `Bearer ${token()}` });

const ROLE_LABELS = { user: 'Користувач', manager: 'Менеджер', admin: 'Адміністратор' };

export const ImageDropZone = ({ onFile, children, style = {} }) => {
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) onFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const onPaste = (e) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (item) handleFile(item.getAsFile());
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pasteHandler = (e) => onPaste(e);
    el.addEventListener('paste', pasteHandler);
    return () => el.removeEventListener('paste', pasteHandler);
  });

  return (
    <div ref={ref} tabIndex={0}
      style={{ outline: 'none', ...style }}
      onDragEnter={e => { e.preventDefault(); setDragging(true); }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onKeyDown={e => e.key === 'v' && e.ctrlKey && ref.current.focus()}>
      {typeof children === 'function' ? children(dragging) : children}
    </div>
  );
};

const AvatarUploader = ({ avatarUrl, username, onUpdate }) => {
  const [hover, setHover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await axios.patch(`${API}/profile/`, fd, {
        headers: { ...authH(), 'Content-Type': 'multipart/form-data' },
      });
      onUpdate(res.data.avatar);
    } catch {}
    setUploading(false);
  };

  const initials = username ? username.slice(0, 2).toUpperCase() : '??';

  return (
    <ImageDropZone onFile={uploadFile} style={{ display: 'inline-block' }}>
      {(dragging) => (
        <div className="pp-avatar-wrap"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => fileRef.current?.click()}
          title="Клікніть, перетягніть або вставте з буферу (Ctrl+V)">
          <div className={`pp-avatar ${avatarUrl ? '' : 'pp-avatar--gradient'}`}
            style={{ border: dragging ? '2px solid #6c9bcf' : '2px solid transparent' }}>
            {uploading
              ? <Loader size={20} color="white" className="spin" />
              : avatarUrl
                ? <img src={avatarUrl} alt="avatar" />
                : <span className="pp-avatar-initials">{initials}</span>
            }
          </div>
          {(hover || dragging) && !uploading && (
            <div className="pp-avatar-overlay"><Camera size={18} color="white" /></div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => uploadFile(e.target.files[0])} />
        </div>
      )}
    </ImageDropZone>
  );
};

const SpecCard = ({ icon, label, value, bg, color, subColor }) => (
  <div className="pp-spec-card" style={{ background: bg }}>
    <div className="pp-spec-icon">{icon}</div>
    <div style={{ minWidth: 0 }}>
      <p className="pp-spec-label" style={{ color: subColor }}>{label}</p>
      <p className="pp-spec-value" style={{ color }}>{value}</p>
    </div>
  </div>
);

const ProfilePanel = ({ dark, collapsed, setCollapsed }) => {
  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subTextColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(132,139,200,0.1)';

  const [specs, setSpecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (collapsed) return;
    const t = token();
    if (!t) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API}/specs/`, { headers: authH() }).catch(() => ({ data: [] })),
      axios.get(`${API}/profile/`, { headers: authH() }).catch(() => null),
    ]).then(([specsRes, profileRes]) => {
      if (specsRes.data.length > 0) setSpecs(specsRes.data[0]);
      if (profileRes?.data) setProfile(profileRes.data);
    }).finally(() => setLoading(false));
  }, [collapsed]);

  return (
    <div className={`pp-root ${theme} ${collapsed ? 'collapsed' : 'expanded'}`}>
      <button className={`pp-toggle ${collapsed ? 'collapsed' : 'expanded'}`}
        onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {!collapsed && (
        <div className="pp-body">
          <div className="pp-header">
            <AvatarUploader
              avatarUrl={profile?.avatar}
              username={profile?.username}
              dark={dark}
              onUpdate={(newUrl) => setProfile(p => ({ ...p, avatar: newUrl }))}
            />
            <h3 className="pp-username" style={{ color: textColor }}>
              {profile?.username || '—'}
            </h3>
            <p className="pp-role" style={{ color: subTextColor }}>
              {ROLE_LABELS[profile?.role] || profile?.role || '—'}
            </p>
            {profile?.ai_credits !== undefined && (
              <div className={`pp-credits ${profile.ai_credits > 0 ? 'positive' : 'empty'}`}>
                ⚡ {profile.ai_credits} AI {profile.ai_credits === 1 ? 'кредит' : 'кредити'}
              </div>
            )}
          </div>

          <div>
            <h4 className="pp-specs-heading" style={{ color: textColor }}>
              <Activity size={16} color="#6c9bcf" /> Характеристики
            </h4>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', color: '#6c9bcf' }}>
                <Loader size={20} className="spin" />
              </div>
            ) : (
              <div className="pp-spec-cards">
                <SpecCard icon={<Cpu size={18} />} label="Процесор"
                  value={specs?.cpu_model || 'Не вказано'}
                  bg={cardBg} color={textColor} subColor={subTextColor} />
                <SpecCard icon={<Monitor size={18} />} label="Відеокарта"
                  value={specs?.gpu_model || 'Не вказано'}
                  bg={cardBg} color={textColor} subColor={subTextColor} />
                <SpecCard icon={<Database size={18} />} label="Пам'ять"
                  value={specs ? `${specs.ram_gb} ГБ RAM` : 'Не вказано'}
                  bg={cardBg} color={textColor} subColor={subTextColor} />
              </div>
            )}

            <div className="pp-hint">
              <p style={{ color: subTextColor }}>
                {specs
                  ? <>Дані актуальні. Запустіть <b>Vortex AI</b> для аналізу.</>
                  : <>Перейдіть до <b>Налаштувань</b> щоб додати характеристики ПК.</>
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePanel;