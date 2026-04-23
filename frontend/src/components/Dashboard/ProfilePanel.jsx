import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Cpu, Activity, Database, Monitor,
  Loader, Camera, Pencil, Check, X, Package, Star,
} from 'lucide-react';
import axios from 'axios';
import './styles/ProfilePanel.css';

const API = "http://${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api";
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

const AvatarUploader = ({ avatarUrl, username, onUpdate, frame }) => {
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

const BannerUploader = ({ bannerUrl, onUpdate }) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('banner', file);
    try {
      const res = await axios.patch(`${API}/profile/`, fd, {
        headers: { ...authH(), 'Content-Type': 'multipart/form-data' },
      });
      onUpdate(res.data.banner);
    } catch {}
    setUploading(false);
  };

  return (
    <div className="pp-banner-wrap" onClick={() => fileRef.current?.click()} title="Змінити банер">
      {bannerUrl
        ? <img src={bannerUrl} alt="banner" className="pp-banner-img" />
        : <div className="pp-banner-empty" />
      }
      <div className="pp-banner-edit-btn">
        {uploading ? <Loader size={12} className="spin" color="#fff" /> : <Camera size={12} color="#fff" />}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => uploadFile(e.target.files[0])} />
    </div>
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

const ProfilePanel = ({ dark, collapsed, setCollapsed, onOpenProfile }) => {
  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subTextColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(132,139,200,0.1)';
  const inputBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(108,155,207,0.07)';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(108,155,207,0.22)';

  const [specs, setSpecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [buildCount, setBuildCount] = useState(0);

  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);

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
      if (profileRes?.data) {
        setProfile(profileRes.data);
        setBioText(profileRes.data.bio || '');
      }
    }).finally(() => setLoading(false));
  }, [collapsed]);
  useEffect(() => {
    if (!profile?.username) return;
    axios.get(`${API}/users/${profile.username}/`, { headers: authH() })
      .then(r => setBuildCount(r.data.build_count ?? 0))
      .catch(() => {});
  }, [profile?.username]);

  const saveUsername = async () => {
    if (!newUsername.trim()) return;
    setSavingUsername(true);
    setUsernameError('');
    try {
      const res = await axios.patch(`${API}/profile/`, { username: newUsername.trim() }, { headers: authH() });
      setProfile(p => ({ ...p, username: res.data.username }));
      setEditingUsername(false);
    } catch (err) {
      setUsernameError(err.response?.data?.error || 'Помилка');
    }
    setSavingUsername(false);
  };

  const saveBio = async () => {
    setSavingBio(true);
    try {
      await axios.patch(`${API}/profile/`, { bio: bioText }, { headers: authH() });
      setProfile(p => ({ ...p, bio: bioText }));
      setEditingBio(false);
    } catch {}
    setSavingBio(false);
  };

  return (
    <div className={`pp-root ${theme} ${collapsed ? 'collapsed' : 'expanded'}`}>
      <button className={`pp-toggle ${collapsed ? 'collapsed' : 'expanded'}`}
        onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {!collapsed && (
        <div className="pp-body">
          <BannerUploader
            bannerUrl={profile?.banner}
            onUpdate={(url) => setProfile(p => ({ ...p, banner: url }))}
          />

          <div className="pp-header">
            <AvatarUploader
              avatarUrl={profile?.avatar}
              username={profile?.username}
              dark={dark}
              frame={profile?.avatar_frame}
              onUpdate={(newUrl) => setProfile(p => ({ ...p, avatar: newUrl }))}
            />

            {editingUsername ? (
              <div className="pp-username-edit">
                <input
                  autoFocus
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false); }}
                  style={{
                    background: inputBg, border: `1px solid ${inputBorder}`,
                    color: textColor, borderRadius: '0.5rem', padding: '0.3rem 0.6rem',
                    fontFamily: 'Poppins, sans-serif', fontSize: '0.85rem', outline: 'none',
                  }}
                />
                {usernameError && <p style={{ color: '#e05252', fontSize: '0.68rem', margin: '2px 0 0' }}>{usernameError}</p>}
                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                  <button onClick={saveUsername} disabled={savingUsername} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B9c85' }}>
                    {savingUsername ? <Loader size={14} className="spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => setEditingUsername(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e05252' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                <h3
                  className="pp-username"
                  style={{ color: profile?.profile_color || textColor, cursor: 'pointer' }}
                  title="Переглянути профіль"
                >
                  {profile?.username || '—'}
                </h3>
                <button onClick={() => { setNewUsername(profile?.username || ''); setEditingUsername(true); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: subTextColor, padding: '2px' }}>
                  <Pencil size={12} />
                </button>
              </div>
            )}

            <p className="pp-role" style={{ color: subTextColor }}>
              {ROLE_LABELS[profile?.role] || profile?.role || '—'}
            </p>

            {buildCount > 0 && (
              <div className="pp-build-count" style={{ color: subTextColor }}>
                <Package size={12} /> {buildCount} {buildCount === 1 ? 'збірка' : 'збірок'} на сайті
              </div>
            )}

            {profile?.ai_credits !== undefined && (
              <div className={`pp-credits ${profile.ai_credits > 0 ? 'positive' : 'empty'}`}>
                ⚡ {profile.ai_credits} AI {profile.ai_credits === 1 ? 'кредит' : 'кредити'}
              </div>
            )}

            {profile?.av_checks_left > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                marginTop: '0.35rem', padding: '0.3rem 0.8rem',
                borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                background: 'rgba(224,82,82,0.1)', color: '#e05252',
                border: '1px solid rgba(224,82,82,0.25)',
              }}>
                🛡 {profile.av_checks_left} {profile.av_checks_left === 1 ? 'AV перевірка' : 'AV перевірок'}
              </div>
            )}

          </div>

          <div className="pp-bio-section">
            {editingBio ? (
              <div>
                <textarea
                  value={bioText}
                  onChange={e => setBioText(e.target.value)}
                  maxLength={500}
                  rows={3}
                  style={{
                    width: '100%', background: inputBg, border: `1px solid ${inputBorder}`,
                    color: textColor, borderRadius: '0.65rem', padding: '0.55rem 0.75rem',
                    fontFamily: 'Poppins, sans-serif', fontSize: '0.78rem', resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                  <button onClick={saveBio} disabled={savingBio} style={{
                    flex: 1, padding: '0.4rem', borderRadius: '0.5rem', border: 'none',
                    background: '#6c9bcf', color: '#fff', fontFamily: 'Poppins, sans-serif',
                    fontSize: '0.75rem', cursor: 'pointer',
                  }}>
                    {savingBio ? <Loader size={12} className="spin" /> : 'Зберегти'}
                  </button>
                  <button onClick={() => { setEditingBio(false); setBioText(profile?.bio || ''); }} style={{
                    padding: '0.4rem 0.7rem', borderRadius: '0.5rem', background: 'none',
                    border: `1px solid ${inputBorder}`, color: subTextColor,
                    fontFamily: 'Poppins, sans-serif', fontSize: '0.75rem', cursor: 'pointer',
                  }}>
                    Скасувати
                  </button>
                </div>
              </div>
            ) : (
              <div className="pp-bio-view" onClick={() => setEditingBio(true)} title="Клікніть щоб редагувати">
                {profile?.bio
                  ? <p style={{ color: subTextColor, fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>{profile.bio}</p>
                  : <p style={{ color: subTextColor, fontSize: '0.73rem', margin: 0, opacity: 0.6 }}>
                      + Додати опис профілю
                    </p>
                }
              </div>
            )}
          </div>

          {profile?.plan === 'pro' && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 className="pp-specs-heading" style={{ color: textColor }}>
              <Star size={16} color="#f7d060" /> Pro кастомізація
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div>
                <p style={{ color: subTextColor, fontSize: '0.7rem', margin: '0 0 0.3rem' }}>Колір нікнейму</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {['', '#f7d060', '#6c9bcf', '#1B9c85', '#e05252', '#a78bfa', '#f97316'].map(color => (
                    <button
                      key={color}
                      onClick={async () => {
                        await axios.patch(`${API}/profile/`, { profile_color: color }, { headers: authH() });
                        setProfile(p => ({ ...p, profile_color: color }));
                      }}
                      style={{
                        width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer',
                        background: color || 'rgba(255,255,255,0.15)',
                        border: profile?.profile_color === color ? '2px solid #fff' : '2px solid transparent',
                        outline: 'none',
                      }}
                      title={color || 'За замовчуванням'}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p style={{ color: subTextColor, fontSize: '0.7rem', margin: '0 0 0.3rem' }}>Рамка аватарки</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { value: '', label: 'Без рамки' },
                    { value: 'gold', label: '🥇 Золота' },
                    { value: 'animated', label: '✨ Анімована' },
                    { value: 'neon', label: '💜 Неонова' },
                  ].map(frame => (
                    <button
                      key={frame.value}
                      onClick={async () => {
                        await axios.patch(`${API}/profile/`, { avatar_frame: frame.value }, { headers: authH() });
                        setProfile(p => ({ ...p, avatar_frame: frame.value }));
                      }}
                      style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem',
                        fontFamily: 'Poppins, sans-serif', cursor: 'pointer', border: 'none',
                        background: profile?.avatar_frame === frame.value
                          ? 'rgba(108,155,207,0.25)' : inputBg,
                        color: profile?.avatar_frame === frame.value ? '#6c9bcf' : subTextColor,
                      }}
                    >
                      {frame.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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