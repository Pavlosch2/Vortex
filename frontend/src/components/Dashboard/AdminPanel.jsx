import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Package, HeadphonesIcon, Users, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Loader, Lock,
  Send, Trash2, RefreshCw,
  Shield, Crown, Database,
} from 'lucide-react';
import './styles/AdminPanel.css';

const API = 'http://127.0.0.1:8000/api';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });

const Badge = ({ label, bg, color }) => (
  <span className="ap-badge" style={{ background: bg, color }}>
    <span className="ap-badge-dot" style={{ background: color }} />
    {label}
  </span>
);

const SUB_STATUS = {
  pending: { label: 'На розгляді', bg: 'rgba(247,208,96,0.15)', color: '#f7d060' },
  approved: { label: 'Схвалено', bg: 'rgba(27,156,133,0.15)', color: '#1B9c85' },
  rejected: { label: 'Відхилено', bg: 'rgba(255,0,96,0.12)', color: '#ff0060' },
};
const TKT_STATUS = {
  open: { label: 'Відкрито', bg: 'rgba(108,155,207,0.15)', color: '#6c9bcf' },
  in_progress: { label: 'В обробці', bg: 'rgba(247,208,96,0.15)', color: '#f7d060' },
  closed: { label: 'Закрито', bg: 'rgba(27,156,133,0.15)', color: '#1B9c85' },
};
const ROLE_MAP = {
  user: { label: 'Користувач', color: '#a3bdcc', icon: null },
  manager: { label: 'Менеджер', color: '#6c9bcf', icon: <Shield size={11} /> },
  admin: { label: 'Адмін', color: '#f7d060', icon: <Crown size={11} /> },
};

const SubmissionFileViewer = ({ submissionId, dark, textColor, subColor, cardBg, border }) => {
  const [open, setOpen] = React.useState(false);
  const [files, setFiles] = React.useState(null);
  const [folderPath, setFolderPath] = React.useState('');
  const [codeFile, setCodeFile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const theme = dark ? 'dark' : 'light';

  const VIEWABLE = ['.lua', '.cs', '.js', '.txt', '.cfg', '.ini', '.json', '.xml', '.asi'];

  const loadFolder = async (folder) => {
    setFolderPath(folder);
    setFiles(null);
    setLoading(true);
    try {
      const res = await axios.get(`${API}/submissions/${submissionId}/files/`, {
        params: { folder, page: 1, page_size: 100 },
        headers: auth(),
      });
      setFiles(res.data);
    } catch (e) {
      setFiles({ error: e.response?.data?.error || 'Немає доступу до файлів або збірка ще не схвалена' });
    }
    setLoading(false);
  };

  const readCode = async (file) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/submissions/${submissionId}/files/read/`, {
        params: { path: file.path },
        headers: auth(),
      });
      setCodeFile({ name: file.name, content: res.data.content });
    } catch (e) {
      setCodeFile({ name: file.name, content: `// Помилка: ${e.response?.data?.error || 'невідома'}` });
    }
    setLoading(false);
  };

  const toggle = () => {
    if (!open) { setOpen(true); loadFolder(''); }
    else { setOpen(false); setFiles(null); setCodeFile(null); setFolderPath(''); }
  };

  return (
    <div className="ap-file-viewer-wrap">
      <button className={`ap-btn--file-viewer ${theme}`} onClick={toggle}>
        📁 {open ? 'Сховати файли' : 'Переглянути файли'}
      </button>

      {open && (
        <div className={`ap-file-viewer-body ${theme}`} style={{ border }}>
          {codeFile ? (
            <>
              <button className="ap-btn--code-back" onClick={() => setCodeFile(null)}>← Назад</button>
              <p className="ap-code-filename" style={{ color: subColor }}>{codeFile.name}</p>
              <pre className={`ap-code-pre ${theme}`}>{codeFile.content}</pre>
            </>
          ) : loading ? (
            <div className="ap-empty" style={{ color: subColor }}>Завантаження...</div>
          ) : files?.error ? (
            <p style={{ color: '#ff0060', fontSize: '0.78rem', fontFamily: 'Poppins, sans-serif', margin: 0 }}>⚠ {files.error}</p>
          ) : (
            <>
              {folderPath && (
                <div className="ap-breadcrumb">
                  <button className="ap-btn--crumb" style={{ color: '#6c9bcf' }} onClick={() => loadFolder('')}>📦 Архів</button>
                  {folderPath.split('/').map((part, i, arr) => {
                    const pathTo = arr.slice(0, i + 1).join('/');
                    const isLast = i === arr.length - 1;
                    return (
                      <span key={pathTo} className="ap-crumb-span">
                        <span className="ap-crumb-sep" style={{ color: subColor }}>/</span>
                        <button className="ap-btn--crumb"
                          onClick={() => !isLast && loadFolder(pathTo)}
                          style={{ color: isLast ? textColor : '#6c9bcf', cursor: isLast ? 'default' : 'pointer' }}>
                          {part}
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="ap-file-list">
                {files?.items?.map((item, i) => item.type === 'dir' ? (
                  <div key={i} className="ap-file-row" style={{ background: cardBg }}
                    onClick={() => loadFolder(item.path)}>
                    <span>📁</span>
                    <span className="ap-file-name" style={{ color: textColor }}>{item.name}</span>
                    <span className="ap-file-size" style={{ color: subColor }}>{item.count} файлів</span>
                  </div>
                ) : (
                  <div key={i} className="ap-file-row ap-file-row--file" style={{ background: cardBg }}>
                    <span>📄</span>
                    <span className="ap-file-name" style={{ color: textColor }}>{item.name}</span>
                    <span className="ap-file-size" style={{ color: subColor }}>{(item.size / 1024).toFixed(1)} KB</span>
                    {VIEWABLE.includes(item.ext) && (
                      <button className="ap-btn--view-code" onClick={() => readCode(item)}>Код</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const SubmissionsTab = ({ dark, addToast }) => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expanded, setExpanded] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(null);

  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.18)';

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/submissions/`, { headers: auth() });
      setSubs(res.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const approve = async (id) => {
    setActing(id);
    try {
      await axios.post(`${API}/submissions/${id}/approve/`, {}, { headers: auth() });
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
    } finally { setActing(null); }
  };

  const reject = async (id) => {
    if (!reason.trim()) return;
    setActing(id);
    try {
      await axios.post(`${API}/submissions/${id}/reject/`, { reason }, { headers: auth() });
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected', rejection_reason: reason } : s));
      setRejectId(null);
      setReason('');
    } finally { setActing(null); }
  };

  const deleteSubmission = (id) => {
    const snapshot = subs.find(s => s.id === id);
    setSubs(prev => prev.filter(s => s.id !== id));
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await axios.delete(`${API}/submissions/${id}/`, { headers: auth() });
      } catch {
        setSubs(prev => [...prev, snapshot].sort((a, b) => a.id - b.id));
      }
    }, 5000);
    addToast({
      type: 'info',
      message: `Заявку "${snapshot?.title}" видалено`,
      duration: 5000,
      collapsible: false,
      cancelTaskId: id,
      onCancel: () => { cancelled = true; clearTimeout(timer); setSubs(prev => [...prev, snapshot].sort((a, b) => a.id - b.id)); },
    });
  };

  const filtered = subs.filter(s => filter === 'all' || s.status === filter);

  return (
    <div>
      <div className="ap-filters">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} className={`ap-pill ${f === filter ? 'active' : ''}`}
            style={f !== filter ? { background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(108,155,207,0.08)', color: subColor } : {}}
            onClick={() => setFilter(f)}>
            {{ all: 'Всі', pending: 'На розгляді', approved: 'Схвалені', rejected: 'Відхилені' }[f]}
            {f === 'pending' && subs.filter(s => s.status === 'pending').length > 0 && (
              <span className="ap-pending-badge">
                {subs.filter(s => s.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
        <button className="ap-refresh" style={{ color: subColor }} onClick={fetchSubs}>
          <RefreshCw size={13} /> Оновити
        </button>
      </div>

      {loading ? (
        <div className="ap-loader"><Loader size={24} className="spin" color="#6c9bcf" /></div>
      ) : filtered.length === 0 ? (
        <p className="ap-empty" style={{ color: subColor }}>Заявок немає</p>
      ) : (
        <div className="ap-list">
          {filtered.map(s => {
            const st = SUB_STATUS[s.status];
            const isOpen = expanded === s.id;
            return (
              <div key={s.id} className="ap-card" style={{ background: cardBg, border }}>
                <button className="ap-card-toggle" onClick={() => setExpanded(isOpen ? null : s.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ap-card-tags">
                      <span className="ap-card-title" style={{ color: textColor }}>{s.title}</span>
                      <Badge {...st} />
                      <span className="ap-card-meta" style={{ color: subColor }}>{s.build_type === 'script' ? 'Скрипт' : 'Збірка'}</span>
                    </div>
                    <p className="ap-card-meta" style={{ color: subColor }}>
                      від {s.submitted_by_name} · {new Date(s.created_at).toLocaleDateString('uk-UA')}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={16} color={subColor} /> : <ChevronDown size={16} color={subColor} />}
                </button>

                {isOpen && (
                  <div className="ap-card-body" style={{ borderTop: border }}>
                    {s.description && <p className="ap-card-desc" style={{ color: textColor }}>{s.description}</p>}
                    {s.tags && <p className="ap-card-tags-text">Теги: {s.tags}</p>}
                    {s.video_url && <a href={s.video_url} target="_blank" rel="noreferrer" className="ap-card-link">▶ Переглянути відео</a>}
                    {s.status === 'rejected' && s.rejection_reason && (
                      <p className="ap-card-reject-reason">Причина: {s.rejection_reason}</p>
                    )}

                    <SubmissionFileViewer submissionId={s.id} dark={dark}
                      textColor={textColor} subColor={subColor} cardBg={cardBg} border={border} />

                    {s.status !== 'pending' && (
                      <button className="ap-btn ap-btn--delete" disabled={acting === s.id}
                        onClick={() => deleteSubmission(s.id)}>
                        {acting === s.id ? <Loader size={12} className="spin" /> : <Trash2 size={12} />} Видалити заявку
                      </button>
                    )}

                    {s.status === 'pending' && (
                      rejectId === s.id ? (
                        <div className="ap-reject-form">
                          <textarea className={`ap-reject-textarea ${theme}`}
                            placeholder="Вкажіть причину відхилення..."
                            value={reason} onChange={e => setReason(e.target.value)}
                            style={{ color: textColor }} />
                          <div className="ap-actions">
                            <button className="ap-btn ap-btn--confirm-reject"
                              disabled={!reason.trim() || acting === s.id}
                              onClick={() => reject(s.id)}>
                              {acting === s.id ? <Loader size={13} className="spin" /> : 'Підтвердити відхилення'}
                            </button>
                            <button className="ap-btn ap-btn--cancel"
                              style={{ color: subColor }}
                              onClick={() => { setRejectId(null); setReason(''); }}>
                              Скасувати
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="ap-actions">
                          <button className="ap-btn ap-btn--approve" disabled={acting === s.id}
                            onClick={() => approve(s.id)}>
                            {acting === s.id ? <Loader size={13} className="spin" /> : <CheckCircle size={14} />} Схвалити
                          </button>
                          <button className="ap-btn ap-btn--reject" onClick={() => setRejectId(s.id)}>
                            <XCircle size={14} /> Відхилити
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SupportTab = ({ dark, addToast }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [expanded, setExpanded] = useState(null);
  const [replies, setReplies] = useState({});
  const [sending, setSending] = useState(null);

  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.18)';

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/support/`, { headers: auth() });
      setTickets(res.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const sendReply = async (id) => {
    const msg = replies[id]?.trim();
    if (!msg) return;
    setSending(id);
    try {
      const res = await axios.post(`${API}/support/${id}/reply/`, { message: msg }, { headers: auth() });
      setTickets(prev => prev.map(t => t.id === id
        ? { ...t, replies: [...(t.replies || []), res.data], status: t.status === 'open' ? 'in_progress' : t.status }
        : t));
      setReplies(prev => ({ ...prev, [id]: '' }));
    } finally { setSending(null); }
  };

  const closeTicket = async (id) => {
    await axios.post(`${API}/support/${id}/close/`, {}, { headers: auth() });
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'closed' } : t));
  };

  const reopenTicket = async (id) => {
    try {
      await axios.post(`${API}/support/${id}/reopen/`, {}, { headers: auth() });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'open' } : t));
    } catch {}
  };

  const deleteTicket = (id) => {
    const snapshot = tickets.find(t => t.id === id);
    setTickets(prev => prev.filter(t => t.id !== id));
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await axios.delete(`${API}/support/${id}/delete_ticket/`, { headers: auth() });
      } catch {
        setTickets(prev => [...prev, snapshot].sort((a, b) => a.id - b.id));
      }
    }, 5000);
    addToast({
      type: 'info',
      message: `Звернення "${snapshot?.subject}" видалено`,
      duration: 5000,
      collapsible: false,
      cancelTaskId: id,
      onCancel: () => { cancelled = true; clearTimeout(timer); setTickets(prev => [...prev, snapshot].sort((a, b) => a.id - b.id)); },
    });
  };

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

  return (
    <div>
      <div className="ap-filters">
        {['all', 'open', 'in_progress', 'closed'].map(f => (
          <button key={f} className={`ap-pill ${f === filter ? 'active' : ''}`}
            style={f !== filter ? { background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(108,155,207,0.08)', color: subColor } : {}}
            onClick={() => setFilter(f)}>
            {{ all: 'Всі', open: 'Відкриті', in_progress: 'В обробці', closed: 'Закриті' }[f]}
          </button>
        ))}
        <button className="ap-refresh" style={{ color: subColor }} onClick={fetchTickets}>
          <RefreshCw size={13} /> Оновити
        </button>
      </div>

      {loading ? (
        <div className="ap-loader"><Loader size={24} className="spin" color="#6c9bcf" /></div>
      ) : filtered.length === 0 ? (
        <p className="ap-empty" style={{ color: subColor }}>Звернень немає</p>
      ) : (
        <div className="ap-list">
          {filtered.map(t => {
            const st = TKT_STATUS[t.status];
            const isOpen = expanded === t.id;
            return (
              <div key={t.id} className="ap-card" style={{ background: cardBg, border }}>
                <button className="ap-card-toggle" onClick={() => setExpanded(isOpen ? null : t.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ap-card-tags">
                      <span className="ap-card-title" style={{ color: textColor }}>{t.subject}</span>
                      <Badge {...st} />
                      {t.reply_count > 0 && (
                        <span className="ap-reply-count">{t.reply_count} відп.</span>
                      )}
                    </div>
                    <p className="ap-card-meta" style={{ color: subColor }}>
                      від {t.submitted_by} · {new Date(t.created_at).toLocaleDateString('uk-UA')}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={16} color={subColor} /> : <ChevronDown size={16} color={subColor} />}
                </button>

                {isOpen && (
                  <div className="ap-card-body" style={{ borderTop: border }}>
                    <div className={`ap-message-box ${theme}`} style={{ border }}>
                      <p className="ap-message-text" style={{ color: textColor }}>{t.message}</p>
                    </div>

                    {t.screenshots?.length > 0 && (
                      <div className="ap-screenshots">
                        {t.screenshots.map((s, i) => (
                          <a key={i} href={s.image} target="_blank" rel="noreferrer">
                            <img src={s.image} alt={`Скріншот ${i + 1}`} className="ap-screenshot-img" style={{ border }} />
                          </a>
                        ))}
                      </div>
                    )}

                    {t.replies?.length > 0 && (
                      <div className="ap-replies">
                        {t.replies.map(r => (
                          <div key={r.id} className={`ap-reply-bubble${r.is_staff ? '' : ' ap-reply-bubble--user'}`}>
                            <div className={`ap-reply-avatar ${r.is_staff ? 'ap-reply-avatar--staff' : `ap-reply-avatar--user ${theme}`}`}>
                              {r.author_avatar
                                ? <img src={r.author_avatar} alt={r.author_name} />
                                : (r.author_name || (r.is_staff ? 'M' : 'U'))[0].toUpperCase()
                              }
                            </div>
                            <div className={`ap-reply-text-wrap ${r.is_staff ? 'ap-reply-text-wrap--staff' : 'ap-reply-text-wrap--user'}`}
                              style={r.is_staff ? {} : { border }}>
                              <p className="ap-reply-text" style={{ color: textColor }}>{r.message}</p>
                              <p className={`ap-reply-author ${r.is_staff ? 'ap-reply-author--staff' : 'ap-reply-author--user'}`}
                                style={{ color: subColor }}>{r.author_name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {t.status !== 'closed' ? (
                      <div className="ap-reply-row">
                        <textarea className={`ap-reply-textarea ${theme}`}
                          placeholder="Написати відповідь..."
                          value={replies[t.id] || ''}
                          onChange={e => setReplies(prev => ({ ...prev, [t.id]: e.target.value }))}
                          style={{ color: textColor }} />
                        <div className="ap-reply-actions">
                          <button className="ap-btn ap-btn--reply"
                            disabled={!replies[t.id]?.trim() || sending === t.id}
                            onClick={() => sendReply(t.id)}>
                            {sending === t.id ? <Loader size={13} className="spin" /> : <Send size={13} />} Відповісти
                          </button>
                          <button className="ap-btn ap-btn--close-ticket" onClick={() => closeTicket(t.id)}>
                            Закрити
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="ap-btn ap-btn--reopen" onClick={() => reopenTicket(t.id)}>
                        ↺ Відновити звернення
                      </button>
                    )}

                    <button className="ap-btn" style={{ background: 'none', border: 'none', color: '#ff0060', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Poppins, sans-serif', cursor: 'pointer' }}
                      onClick={() => deleteTicket(t.id)}>
                      <Trash2 size={12} /> Видалити звернення
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BuildsTab = ({ dark, currentRole, addToast }) => {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [viewFiles, setViewFiles] = useState(null);
  const [files, setFiles] = useState(null);
  const [folderPath, setFolderPath] = useState('');
  const [codeFile, setCodeFile] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.18)';

  const VIEWABLE = ['.lua', '.cs', '.js', '.txt', '.cfg', '.ini', '.json', '.xml', '.asi'];

  const fetchBuilds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/builds/`, { headers: auth() });
      setBuilds(res.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBuilds(); }, [fetchBuilds]);

  const loadFolder = async (buildId, folder) => {
    setFolderPath(folder);
    setFiles(null);
    try {
      const res = await axios.get(`${API}/builds/${buildId}/files/`, {
        params: { folder, page: 1, page_size: 100 },
      });
      setFiles(res.data);
    } catch (e) {
      setFiles({ error: e.response?.data?.error || 'Помилка завантаження' });
    }
  };

  const openFiles = async (build) => {
    setViewFiles(build);
    setFolderPath('');
    setFiles(null);
    setCodeFile(null);
    await loadFolder(build.id, '');
  };

  const readCode = async (file) => {
    setCodeLoading(true);
    try {
      const res = await axios.get(`${API}/builds/${viewFiles.id}/files/read/`, {
        params: { path: file.path },
      });
      setCodeFile({ name: file.name, content: res.data.content, ext: res.data.ext });
    } catch (e) {
      setCodeFile({ name: file.name, content: `// Помилка: ${e.response?.data?.error || 'невідома'}`, ext: '.txt' });
    }
    setCodeLoading(false);
  };

  const deleteBuild = async (id) => {
    setActing(id);
    try {
      await axios.delete(`${API}/admin/builds/${id}/`, { headers: auth() });
      setBuilds(prev => prev.filter(b => b.id !== id));
      setConfirmId(null);
      if (viewFiles?.id === id) setViewFiles(null);
      addToast({ type: 'success', message: 'Збірку видалено та приховано в Archive.org', duration: 5000 });
    } catch {
      addToast({ type: 'error', message: 'Помилка при видаленні', duration: 5000 });
    } finally { setActing(null); }
  };

  const restoreBuild = async (build) => {
    if (!build.archive_identifier) {
      addToast({ type: 'error', message: 'Збірка не має Archive.org identifier', duration: 5000 });
      return;
    }
    setActing(build.id);
    try {
      await axios.post(`${API}/admin/builds/${build.id}/restore_archive/`, {}, { headers: auth() });
      addToast({ type: 'success', message: 'Збірку відновлено в Archive.org', duration: 5000 });
    } catch (e) {
      addToast({ type: 'error', message: e.response?.data?.error || 'Помилка відновлення', duration: 5000 });
    } finally { setActing(null); }
  };

  const filtered = builds.filter(b => {
    const matchType = filter === 'all' || b.build_type === filter;
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  if (currentRole !== 'admin') return (
    <div className="ap-lock" style={{ color: subColor }}>
      <div className="ap-lock-icon"><Lock size={36} /></div>
      <p>Доступно тільки адміністраторам</p>
    </div>
  );

  if (viewFiles) return (
    <div>
      <button className="ap-btn--back" onClick={() => { setViewFiles(null); setCodeFile(null); }}>
        ← Назад до списку
      </button>
      <h3 className="ap-files-title" style={{ color: textColor }}>📦 {viewFiles.title}</h3>

      {codeFile ? (
        <div>
          <button className="ap-btn--code-back" onClick={() => setCodeFile(null)}>← Назад до файлів</button>
          <p className="ap-code-filename--lg" style={{ color: subColor }}>{codeFile.name}</p>
          <pre className={`ap-code-pre ap-code-pre--lg ${theme}`} style={{ color: textColor }}>{codeFile.content}</pre>
        </div>
      ) : (
        <>
          <div className="ap-breadcrumb ap-breadcrumb--lg">
            <button className="ap-btn--crumb"
              style={{ color: folderPath ? '#6c9bcf' : textColor, fontWeight: folderPath ? 400 : 600 }}
              onClick={() => loadFolder(viewFiles.id, '')}>
              📦 Архів
            </button>
            {folderPath && folderPath.split('/').map((part, i, arr) => {
              const pathTo = arr.slice(0, i + 1).join('/');
              const isLast = i === arr.length - 1;
              return (
                <span key={pathTo} className="ap-crumb-span">
                  <span className="ap-crumb-sep" style={{ color: subColor }}>/</span>
                  <button className="ap-btn--crumb"
                    onClick={() => !isLast && loadFolder(viewFiles.id, pathTo)}
                    style={{ color: isLast ? textColor : '#6c9bcf', cursor: isLast ? 'default' : 'pointer', fontWeight: isLast ? 600 : 400 }}>
                    {part}
                  </button>
                </span>
              );
            })}
            {files?.total_files !== undefined && (
              <span style={{ marginLeft: 'auto', color: subColor, fontSize: '0.7rem' }}>{files.total_files} файлів</span>
            )}
          </div>

          {!files ? (
            <div className="ap-loader"><Loader size={20} color="#6c9bcf" className="spin" /></div>
          ) : files.error ? (
            <p style={{ color: '#ff0060', fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem' }}>⚠ {files.error}</p>
          ) : (
            <div className="ap-file-list ap-file-list--lg">
              {files.items?.map((item, i) => item.type === 'dir' ? (
                <div key={i} className="ap-file-row" style={{ background: cardBg, border }}
                  onClick={() => loadFolder(viewFiles.id, item.path)}>
                  <span>📁</span>
                  <span className="ap-file-name ap-file-name--lg" style={{ color: textColor }}>{item.name}</span>
                  <span className="ap-file-size ap-file-size--lg" style={{ color: subColor }}>{item.count} файлів</span>
                </div>
              ) : (
                <div key={i} className="ap-file-row ap-file-row--file" style={{ background: cardBg, border }}>
                  <span>📄</span>
                  <span className="ap-file-name ap-file-name--lg" style={{ color: textColor }}>{item.name}</span>
                  <span className="ap-file-size ap-file-size--lg" style={{ color: subColor }}>{(item.size / 1024).toFixed(1)} KB</span>
                  {VIEWABLE.includes(item.ext) && (
                    <button className="ap-btn--view-code ap-btn--view-code--lg" onClick={() => readCode(item)}>
                      Переглянути
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {codeLoading && <div className="ap-loader"><Loader size={18} color="#6c9bcf" className="spin" /></div>}
        </>
      )}
    </div>
  );

  return (
    <div>
      <div className="ap-builds-toolbar">
        {['all', 'build', 'script'].map(f => (
          <button key={f} className={`ap-pill ${f === filter ? 'active' : ''}`}
            style={f !== filter ? { background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(108,155,207,0.08)', color: subColor } : {}}
            onClick={() => setFilter(f)}>
            {{ all: 'Всі', build: 'Збірки', script: 'Скрипти' }[f]}
          </button>
        ))}
        <input className={`ap-search-input ${theme}`}
          placeholder="Пошук за назвою..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ color: textColor }} />
        <button className="ap-refresh" style={{ color: subColor }} onClick={fetchBuilds}>
          <RefreshCw size={13} /> Оновити
        </button>
      </div>

      <p className="ap-builds-count" style={{ color: subColor }}>Всього: {filtered.length}</p>

      {loading ? (
        <div className="ap-loader"><Loader size={24} className="spin" color="#6c9bcf" /></div>
      ) : filtered.length === 0 ? (
        <p className="ap-empty" style={{ color: subColor }}>Збірок не знайдено</p>
      ) : (
        <div className="ap-list">
          {filtered.map(b => {
            const cover = b.images?.find(i => i.is_cover) || b.images?.[0];
            const typeColor = b.build_type === 'script' ? '#1B9c85' : '#6c9bcf';
            const isConfirm = confirmId === b.id;
            const hasArchive = !!b.archive_identifier;
            return (
              <div key={b.id} className="ap-build-row" style={{ background: cardBg, border }}>
                <div className={`ap-build-thumb ${theme}`}>
                  {cover
                    ? <img src={cover.image} alt={b.title} />
                    : <span className="ap-build-thumb-empty">📦</span>
                  }
                </div>
                <div className="ap-build-info">
                  <div className="ap-card-tags">
                    <span className="ap-build-title" style={{ color: textColor }}>{b.title}</span>
                    <span className="ap-build-type-badge"
                      style={{ color: typeColor, background: `${typeColor}22` }}>
                      {b.build_type === 'script' ? 'Скрипт' : 'Збірка'}
                    </span>
                    {hasArchive && (
                      <a href={b.archive_url || `https://archive.org/details/${b.archive_identifier}`}
                        target="_blank" rel="noreferrer" className="ap-build-archive-link">
                        Archive.org ↗
                      </a>
                    )}
                  </div>
                  <p className="ap-build-meta" style={{ color: subColor }}>
                    ★ {b.rating} · {b.review_count || 0} відгуків · ID: {b.id}
                  </p>
                </div>
                <div className="ap-build-actions">
                  <button className="ap-btn ap-btn--files"
                    style={{ border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(108,155,207,0.25)', color: subColor }}
                    onClick={() => openFiles(b)}>
                    <Database size={13} /> Файли
                  </button>
                  {hasArchive && (
                    <button className="ap-btn ap-btn--restore" disabled={acting === b.id}
                      onClick={() => restoreBuild(b)}>
                      {acting === b.id ? <Loader size={11} className="spin" /> : '↺'} Відновити
                    </button>
                  )}
                  {isConfirm ? (
                    <div className="ap-confirm-row">
                      <span className="ap-confirm-label">Видалити?</span>
                      <button className="ap-btn ap-btn--confirm-delete" disabled={acting === b.id}
                        onClick={() => deleteBuild(b.id)}>
                        {acting === b.id ? <Loader size={11} className="spin" /> : <CheckCircle size={11} />} Так
                      </button>
                      <button className="ap-btn ap-btn--cancel-delete" style={{ color: subColor }}
                        onClick={() => setConfirmId(null)}>Ні</button>
                    </div>
                  ) : (
                    <button className="ap-btn ap-btn--delete-build" onClick={() => setConfirmId(b.id)}>
                      <Trash2 size={13} /> Видалити
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BLOCK_DURATIONS = [
  { value: '1d', label: '1 день' },
  { value: '3d', label: '3 дні' },
  { value: '7d', label: '7 днів' },
  { value: '30d', label: '30 днів' },
  { value: 'permanent', label: 'Перманентне блокування (назавжди)' },
];
 
const WarnBlockModal = ({ user, dark, onClose, onDone, addToast, warningId }) => {
  const [reason, setReason] = useState('');
  const [step, setStep] = useState('form');
  const [duration, setDuration] = useState('');
  const [acting, setActing] = useState(false);
 
  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const bg = dark ? 'rgba(20,22,28,0.98)' : 'rgba(255,255,255,0.98)';
  const border = dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(132,139,200,0.2)';
 
  const canAct = reason.trim().length > 0;
 
  const sendWarning = async () => {
    setActing(true);
    try {
      await axios.post(`${API}/admin/users/${user.id}/warn/`, { reason }, { headers: auth() });
      addToast({ type: 'success', message: `Попередження надіслано «${user.username}»`, duration: 4000 });
      onDone();
    } catch {
      addToast({ type: 'error', message: 'Помилка при надсиланні попередження', duration: 4000 });
    }
    setActing(false);
    onClose();
  };
 
  const doBlock = async () => {
    if (!duration) return;
    setActing(true);
    try {
      await axios.post(`${API}/admin/users/${user.id}/block/`, {
        reason,
        duration,
        ...(warningId ? { warning_id: warningId } : {}),
      }, { headers: auth() });
      addToast({ type: 'success', message: `«${user.username}» заблоковано`, duration: 4000 });
      onDone();
    } catch {
      addToast({ type: 'error', message: 'Помилка при блокуванні', duration: 4000 });
    }
    setActing(false);
    onClose();
  };
 
  return (
    <div className="wbm-overlay" onClick={onClose}>
      <div className="wbm-modal" style={{ background: bg, border }} onClick={e => e.stopPropagation()}>
        <p className="wbm-desc" style={{ color: subColor }}>
          Ви збираєтесь застосувати санкції до користувача{' '}
          <strong style={{ color: textColor }}>«{user.username}»</strong>.
          Вкажіть причину порушення у полі нижче — вона буде збережена в системі та надіслана користувачу.
        </p>
        <textarea
          className={`wbm-textarea ${theme}`}
          style={{ color: textColor }}
          placeholder="Причина порушення..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
        />
 
        {step === 'form' && (
          <div className="wbm-actions">
            <button className="ap-btn ap-btn--warn" disabled={!canAct || acting} onClick={sendWarning}>
              {acting ? <Loader size={13} className="spin" /> : '⚠️'} Надіслати попередження
            </button>
            <button className="ap-btn ap-btn--block-now" disabled={!canAct} onClick={() => setStep('duration')}>
              🚫 Заблокувати одразу
            </button>
            <button className="ap-btn ap-btn--cancel" onClick={onClose}>Скасувати</button>
          </div>
        )}
 
        {step === 'duration' && (
          <div className="wbm-duration-step">
            <p className="wbm-duration-label" style={{ color: subColor }}>Оберіть термін блокування:</p>
            <div className="wbm-duration-list">
              {BLOCK_DURATIONS.map(d => (
                <button
                  key={d.value}
                  className={`wbm-duration-btn ${duration === d.value ? 'selected' : ''} ${theme}`}
                  style={{ color: textColor }}
                  onClick={() => setDuration(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="wbm-actions">
              <button className="ap-btn ap-btn--block-now" disabled={!duration || acting} onClick={doBlock}>
                {acting ? <Loader size={13} className="spin" /> : '🚫'} Підтвердити блокування
              </button>
              <button className="ap-btn ap-btn--cancel" onClick={() => setStep('form')}>← Назад</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const WarningsTab = ({ dark, currentRole, addToast }) => {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockModal, setBlockModal] = useState(null);
  const [now, setNow] = useState(Date.now());
 
  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.18)';
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
 
  const canModerate = currentRole === 'admin' || currentRole === 'manager';
 
  useEffect(() => {
    if (!canModerate) return;
    fetchWarnings();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [canModerate]);
 
  const fetchWarnings = () => {
    setLoading(true);
    axios.get(`${API}/admin/warnings/`, { headers: auth() })
      .then(r => setWarnings(r.data))
      .finally(() => setLoading(false));
  };
 
  const deleteWarning = async (id, username) => {
    if (!window.confirm(`Видалити попередження для користувача ${username}? Цю дію не можна скасувати`)) return;
    try {
      await axios.delete(`${API}/admin/warnings/${id}/`, { headers: auth() });
      setWarnings(prev => prev.filter(w => w.id !== id));
      addToast({ type: 'success', message: 'Попередження видалено', duration: 3000 });
    } catch {
      addToast({ type: 'error', message: 'Помилка видалення', duration: 3000 });
    }
  };
 
  const formatCountdown = (seconds) => {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
 
  const getLiveSeconds = (w) => {
    if (w.status !== 'active') return 0;
    return Math.max(0, Math.floor((new Date(w.expires_at) - now) / 1000));
  };
 
  const STATUS_STYLE = {
    active:   { label: '🟡 Активне',     color: '#f7d060' },
    expired:  { label: '🔴 Прострочене', color: '#e05252' },
    executed: { label: '✅ Виконане',     color: '#1B9c85' },
  };
 
  if (!canModerate) return (
    <div className="ap-lock" style={{ color: subColor }}>
      <div className="ap-lock-icon"><Lock size={36} /></div>
      <p>Доступно тільки адміністраторам та менеджерам</p>
    </div>
  );
 
  if (loading) return <div className="ap-loader"><Loader size={24} className="spin" color="#6c9bcf" /></div>;
 
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 0.75rem' }}>
        <button className="ap-refresh" style={{ color: subColor }} onClick={fetchWarnings}>
          <RefreshCw size={14} /> Оновити
        </button>
      </div>
 
      {warnings.length === 0 ? (
        <p className="ap-empty" style={{ color: subColor }}>Попереджень немає</p>
      ) : (
        <div className="ap-list">
          {warnings.map(w => {
            const st = STATUS_STYLE[w.status] || STATUS_STYLE.active;
            const liveSeconds = getLiveSeconds(w);
            return (
              <div key={w.id} className="ap-card" style={{ background: cardBg, border }}>
                <div className="ap-warn-row">
                  <div className="ap-warn-info">
                    <div className="ap-warn-header">
                      <span className="ap-warn-user" style={{ color: textColor }}>👤 {w.user_name}</span>
                      <span className="ap-warn-status" style={{ color: st.color }}>{st.label}</span>
                      {w.status === 'active' && (
                        <span className="ap-warn-countdown" style={{ color: '#f7d060' }}>
                          ⏱ {formatCountdown(liveSeconds)}
                        </span>
                      )}
                    </div>
                    <p className="ap-warn-reason" style={{ color: subColor }}>
                      Причина: <span style={{ color: textColor }}>{w.reason}</span>
                    </p>
                    <p className="ap-warn-meta" style={{ color: subColor }}>
                      Надіслав: {w.issued_by_name} · {new Date(w.created_at).toLocaleDateString('uk-UA')}
                    </p>
                  </div>
                  <div className="ap-warn-actions">
                    {w.status === 'expired' && (
                      <button
                        className="ap-btn ap-btn--block"
                        onClick={() => setBlockModal({ user: { id: null, username: w.user_name }, warningId: w.id, userName: w.user_name })}
                      >
                        🚫 Заблокувати
                      </button>
                    )}
                    {w.status === 'active' && (
                      <button className="ap-btn ap-btn--block-disabled" disabled title="Доступно після завершення терміну попередження">
                        🚫 Заблокувати
                      </button>
                    )}
                    {w.status !== 'executed' && (
                      <button className="ap-btn ap-btn--delete" onClick={() => deleteWarning(w.id, w.user_name)}>
                        <Trash2 size={12} /> Видалити
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
 
      {blockModal && (
        <WarnBlockModal
          user={{ id: blockModal.user.id, username: blockModal.userName }}
          dark={dark}
          addToast={addToast}
          warningId={blockModal.warningId}
          onClose={() => setBlockModal(null)}
          onDone={() => { fetchWarnings(); setBlockModal(null); }}
        />
      )}
    </>
  );
};

const UsersTab = ({ dark, currentRole, addToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [patch, setPatch] = useState({});
  const [saving, setSaving] = useState(null);
  const [modalUser, setModalUser] = useState(null);
 
  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.18)';
 
  const canModerate = currentRole === 'admin' || currentRole === 'manager';
 
  useEffect(() => {
    if (!canModerate) return;
    axios.get(`${API}/admin/users/`, { headers: auth() })
      .then(r => setUsers(r.data))
      .finally(() => setLoading(false));
  }, [canModerate]);
 
  const save = async (id) => {
    setSaving(id);
    try {
      const res = await axios.patch(`${API}/admin/users/${id}/`, patch, { headers: auth() });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...res.data } : u));
      setEditing(null);
      setPatch({});
    } finally { setSaving(null); }
  };
 
  const deleteUser = (id, username) => {
    const snapshot = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await axios.delete(`${API}/admin/users/${id}/`, { headers: auth() });
      } catch {
        setUsers(prev => [...prev, snapshot].sort((a, b) => a.id - b.id));
      }
    }, 5000);
    addToast({
      type: 'info',
      message: `Користувача "${username}" видалено`,
      duration: 5000,
      collapsible: false,
      cancelTaskId: id,
      onCancel: () => { cancelled = true; clearTimeout(timer); setUsers(prev => [...prev, snapshot].sort((a, b) => a.id - b.id)); },
    });
  };
 
  const unblock = async (id, username) => {
    try {
      await axios.post(`${API}/admin/users/${id}/unblock/`, {}, { headers: auth() });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_blocked: false } : u));
      addToast({ type: 'success', message: `«${username}» розблоковано`, duration: 3000 });
    } catch {
      addToast({ type: 'error', message: 'Помилка розблокування', duration: 3000 });
    }
  };
 
  if (!canModerate) return (
    <div className="ap-lock" style={{ color: subColor }}>
      <div className="ap-lock-icon"><Lock size={36} /></div>
      <p>Доступно тільки адміністраторам та менеджерам</p>
    </div>
  );
 
  if (loading) return (
    <div className="ap-loader"><Loader size={24} className="spin" color="#6c9bcf" /></div>
  );
 
  return (
    <>
      <div className="ap-users-list">
        {users.map(u => {
          const rm = ROLE_MAP[u.role] || ROLE_MAP.user;
          const isEdit = editing === u.id;
          return (
            <div key={u.id} className="ap-user-row"
              style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)', border }}>
              <div className="ap-user-avatar">
                {u.avatar
                  ? <img src={u.avatar} alt={u.username} />
                  : u.username[0].toUpperCase()
                }
              </div>
              <div className="ap-user-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="ap-user-name" style={{ color: textColor }}>{u.username}</span>
                  <span className="ap-user-role" style={{ color: rm.color }}>{rm.icon} {rm.label}</span>
                  {u.is_blocked && (
                    <span className="ap-user-blocked-badge">🚫 Заблоковано</span>
                  )}
                </div>
                <p className="ap-user-meta" style={{ color: subColor }}>
                  {u.email || 'email не вказано'} · {u.ai_credits} AI кредитів
                  {u.is_premium && <span className="ap-user-premium">⚡ Premium</span>}
                </p>
              </div>
              {isEdit ? (
                <div className="ap-user-edit">
                  {currentRole === 'admin' && (
                    <select className={`ap-select ${theme}`} style={{ color: textColor }}
                      defaultValue={u.role} onChange={e => setPatch(p => ({ ...p, role: e.target.value }))}>
                      <option value="user">Користувач</option>
                      <option value="manager">Менеджер</option>
                      <option value="admin">Адмін</option>
                    </select>
                  )}
                  {currentRole === 'admin' && (
                    <input type="number" min={0} placeholder="AI кредити"
                      className={`ap-credits-input ${theme}`} style={{ color: textColor }}
                      defaultValue={u.ai_credits}
                      onChange={e => setPatch(p => ({ ...p, ai_credits: parseInt(e.target.value) }))} />
                  )}
                  {currentRole === 'admin' && (
                    <label className="ap-premium-label" style={{ color: subColor }}>
                      <input type="checkbox" defaultChecked={u.is_premium}
                        onChange={e => setPatch(p => ({ ...p, is_premium: e.target.checked }))} /> Premium
                    </label>
                  )}
                  {currentRole === 'admin' && (
                    <button className="ap-btn ap-btn--save" disabled={saving === u.id} onClick={() => save(u.id)}>
                      {saving === u.id ? <Loader size={12} className="spin" /> : 'Зберегти'}
                    </button>
                  )}
                  <button className="ap-btn ap-btn--cancel-edit" style={{ color: subColor }}
                    onClick={() => { setEditing(null); setPatch({}); }}>✕</button>
                </div>
              ) : (
                <div className="ap-user-actions">
                  {currentRole === 'admin' && (
                    <button className="ap-btn ap-btn--edit"
                      style={{ border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(108,155,207,0.25)', color: subColor }}
                      onClick={() => setEditing(u.id)}>
                      Редагувати
                    </button>
                  )}
                  {u.is_blocked ? (
                    <button className="ap-btn ap-btn--unblock" onClick={() => unblock(u.id, u.username)}>
                      ✅ Розблокувати
                    </button>
                  ) : (
                    <button className="ap-btn ap-btn--block" onClick={() => setModalUser(u)}>
                      🚫 Санкції
                    </button>
                  )}
                  {currentRole === 'admin' && (
                    <button className="ap-btn ap-btn--delete-user" onClick={() => deleteUser(u.id, u.username)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
 
      {modalUser && (
        <WarnBlockModal
          user={modalUser}
          dark={dark}
          addToast={addToast}
          onClose={() => setModalUser(null)}
          onDone={() => {
            axios.get(`${API}/admin/users/`, { headers: auth() }).then(r => setUsers(r.data));
          }}
        />
      )}
    </>
  );
};
 

const AdminPanel = ({ dark, currentRole, addToast }) => {
  const [tab, setTab] = useState('submissions');
  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';

  const tabs = [
    { id: 'submissions', label: 'Заявки', icon: <Package size={15} /> },
    { id: 'support', label: 'Підтримка', icon: <HeadphonesIcon size={15} /> },
    { id: 'builds', label: 'Збірки', icon: <Database size={15} /> },
    { id: 'users', label: 'Користувачі', icon: <Users size={15} /> },
    { id: 'warnings', label: 'Попередження', icon: <Shield size={15} /> },
  ];

  return (
    <div className="ap-root">
      <div className="ap-intro">
        <h2 className="ap-heading" style={{ color: textColor }}>Панель керування</h2>
        <p className="ap-subheading" style={{ color: subColor }}>
          {currentRole === 'admin' ? 'Адміністратор' : 'Менеджер'}
        </p>
      </div>
      <div className={`ap-tabs ${theme}`}>
        {tabs.map(t => (
          <button key={t.id}
            className={`ap-tab ${tab === t.id ? 'active' : 'inactive'} ${theme}`}
            onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'submissions' && <SubmissionsTab dark={dark} addToast={addToast} />}
      {tab === 'support' && <SupportTab dark={dark} addToast={addToast} />}
      {tab === 'builds' && <BuildsTab dark={dark} currentRole={currentRole} addToast={addToast} />}
      {tab === 'users' && <UsersTab dark={dark} currentRole={currentRole} addToast={addToast} />}
      {tab === 'warnings' && <WarningsTab dark={dark} currentRole={currentRole} addToast={addToast} />}
    </div>
  );
};

export default AdminPanel;