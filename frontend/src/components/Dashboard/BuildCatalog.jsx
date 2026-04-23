import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Star, Download, Magnet, ChevronDown, ChevronUp, ChevronRight,
  Loader, Bot, X, SlidersHorizontal, Flame,
  Plus, Upload, AlertCircle,
  Cpu, FileText, Layers, MessageSquare, ThumbsUp, Code, ImageIcon, File,
  Edit3
} from 'lucide-react';
import './styles/BuildCatalog.css';
import { UserLink } from '../UserHoverCard';
import { ImageDropZone } from './ProfilePanel';

const API = 'http://${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api';
const getToken = () => localStorage.getItem('vortex_token');
const auth = () => ({ Authorization: 'Bearer ' + getToken() });

const StarRating = ({ value }) => (
  <div className="star-rating">
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} size={12}
        fill={n <= Math.round(value) ? '#f7d060' : 'none'}
        color={n <= Math.round(value) ? '#f7d060' : '#a3bdcc'} />
    ))}
    <span className="star-rating__val">{Number(value).toFixed(1)}</span>
  </div>
);

const RatingBadge = ({ rating, reviewCount }) => {
  const hasRating = reviewCount > 0;
  let bg, color;
  if (!hasRating) {
    bg = 'rgba(0,0,0,0.55)';
    color = '#a3bdcc';
  } else if (rating >= 4.0) {
    bg = 'rgba(27,156,133,0.75)';
    color = '#fff';
  } else if (rating >= 2.5) {
    bg = 'rgba(200,160,0,0.8)';
    color = '#fff';
  } else {
    bg = 'rgba(200,60,60,0.8)';
    color = '#fff';
  }
 
  const tooltip = hasRating
    ? `Середня оцінка: ${Number(rating).toFixed(1)} · На основі ${reviewCount} відгуків`
    : 'Ще немає оцінок';
 
  return (
    <div
      title={tooltip}
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        minWidth: '36px',
        height: '36px',
        borderRadius: '50%',
        background: bg,
        border: `1.5px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: 700,
        color,
        backdropFilter: 'blur(6px)',
        zIndex: 2,
        cursor: 'default',
        userSelect: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      {hasRating ? Number(rating).toFixed(1) : '—'}
    </div>
  );
};

const TagList = ({ tags, dark }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tags : tags.slice(0, 2);
  const theme = dark ? 'dark' : 'light';
  return (
    <div className="taglist" onClick={e => e.stopPropagation()}>
      {visible.map(tag => (
        <span key={tag} className={`taglist__tag ${theme}`}>{tag}</span>
      ))}
      {!expanded && tags.length > 2 && (
        <button className="taglist__more" onClick={e => { e.stopPropagation(); setExpanded(true); }}>
          +{tags.length - 2}
        </button>
      )}
    </div>
  );
};

const InstallModal = ({ build, dark, onClose }) => {
  if (!build) return null;
  const theme = dark ? 'dark' : 'light';
  const hasTorrent = !!(build.magnet_link || build.torrent_file);

  return (
    <div className="install-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`install-modal ${theme}`}>
        <div className="install-modal__header">
          <div className="install-modal__header-text">
            <h3 className="install-modal__title">Встановити збірку</h3>
            <p className="install-modal__sub">{build.title}</p>
          </div>
          <button className="install-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="install-modal__body">
          {build.archive_url ? (
            <div className="install-modal__primary">
              <div className="install-modal__primary-label">
                <span className="install-modal__star">⭐</span>
                Рекомендований спосіб
              </div>
              <a
                href={build.archive_url}
                target="_blank"
                rel="noreferrer"
                className="install-modal__btn-main"
              >
                <Download size={17} />
                Завантажити з Internet Archive
              </a>
              {build.archive_identifier && (
                <a
                  href={`https://archive.org/details/${build.archive_identifier}`}
                  target="_blank"
                  rel="noreferrer"
                  className="install-modal__archive-page"
                >
                  Переглянути сторінку на Archive.org →
                </a>
              )}
            </div>
          ) : (
            <div className="install-modal__pending">
              <div className="install-modal__pending-icon">⏳</div>
              <p>Файл завантажується на сервер, зачекайте...</p>
            </div>
          )}

          {hasTorrent && (
            <div className="install-modal__alt">
              <div className="install-modal__alt-label">Альтернативно — через торент-клієнт</div>
              <div className="install-modal__alt-links">
                {build.magnet_link && (
                  <a href={build.magnet_link} className="install-modal__btn-alt">
                    <Magnet size={15} />
                    Magnet-посилання
                  </a>
                )}
                {build.torrent_file && (
                  <a href={build.torrent_file} download className="install-modal__btn-alt">
                    <Download size={15} />
                    .torrent файл
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TABS = ['FILES', 'IMAGES', 'POSTS', 'REVIEWS'];

const StarPicker = ({ value, onChange }) => (
  <div className="bdp__star-picker">
    {[1, 2, 3, 4, 5].map(n => (
      <span key={n} className="bdp__star"
        style={{ color: n <= value ? '#f7d060' : '#ccc' }}
        onClick={() => onChange(n)}>★</span>
    ))}
  </div>
);

const PostItem = ({ post, dark, token, textColor, subColor, bgCard, border, buildId,
  onDeleted, onEdited, onReplied, onReplyDeleted, addToast }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const authHdr = token ? { Authorization: `Bearer ${token}` } : {};

  const saveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const r = await axios.patch(
        `${API}/builds/${buildId}/posts/${post.id}/edit/`,
        { text: editText },
        { headers: authHdr }
      );
      onEdited(r.data);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const r = await axios.post(
        `${API}/builds/${buildId}/posts/${post.id}/reply/`,
        { text: replyText },
        { headers: authHdr }
      );
      onReplied(post.id, r.data);
      setReplyText('');
      setReplying(false);
    } catch {}
    setSaving(false);
  };

  const deletePost = async () => {
    try {
      await axios.delete(`${API}/builds/${buildId}/posts/${post.id}/`, { headers: authHdr });
      onDeleted(post.id);
    } catch (e) {
      if (e.response?.status === 403) {
        addToast({ type: 'error', message: 'Не можна видалити чужий пост', duration: 4000 });
      }
    }
  };

  const deleteReply = async (replyId) => {
    try {
      await axios.delete(`${API}/builds/${buildId}/posts/${post.id}/reply/${replyId}/`, { headers: authHdr });
      onReplyDeleted(post.id, replyId);
    } catch {}
  };

  return (
    <div className="bdp__post-item" style={{ background: bgCard, border }}>
      {post.is_pinned && <span className="bdp__post-pin">📌 Закріплено</span>}
      <div className="bdp__post-meta">
        <span className="bdp__post-author">{post.username}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="bdp__post-date" style={{ color: subColor }}>
            {new Date(post.created_at).toLocaleDateString('uk-UA')}
          </span>
          {token && post.is_own && !editing && (
            <>
              <button className="bdp__post-icon-btn" onClick={() => { setEditing(true); setEditText(post.text); }}
                title="Редагувати" style={{ color: '#6c9bcf' }}>
                <Edit3 size={12} />
              </button>
              <button className="bdp__post-icon-btn" onClick={deletePost}
                title="Видалити" style={{ color: subColor }}>
                <X size={12} />
              </button>
            </>
          )}
          {token && !post.is_own && (
            <button className="bdp__post-del" onClick={deletePost}><X size={12} /></button>
          )}
        </div>
      </div>

      {editing ? (
        <div style={{ marginTop: '0.4rem' }}>
          <textarea className="bdp__post-textarea" value={editText} rows={3}
            onChange={e => setEditText(e.target.value)} style={{ color: textColor }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button className="bdp__post-submit" onClick={saveEdit} disabled={saving}>
              {saving ? '...' : 'Зберегти'}
            </button>
            <button className="bdp__post-cancel" onClick={() => setEditing(false)}>Скасувати</button>
          </div>
        </div>
      ) : (
        <p className="bdp__post-text" style={{ color: textColor }}>{post.text}</p>
      )}

      {post.replies?.length > 0 && (
        <div className="bdp__replies">
          {post.replies.map(r => (
            <div key={r.id} className="bdp__reply-item">
              <div className="bdp__post-meta">
                <span className="bdp__post-author" style={{ fontSize: '0.78rem' }}>↳ {r.username}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: subColor, fontSize: '0.72rem' }}>
                    {new Date(r.created_at).toLocaleDateString('uk-UA')}
                  </span>
                  {r.is_own && (
                    <button className="bdp__post-icon-btn" onClick={() => deleteReply(r.id)}
                      style={{ color: subColor }}>
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
              <p style={{ color: textColor, fontSize: '0.83rem', margin: '0.2rem 0 0' }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {token && !editing && (
        replying ? (
          <div className="bdp__reply-form">
            <textarea className="bdp__post-textarea" value={replyText} rows={2}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Ваша відповідь..." style={{ color: textColor }} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <button className="bdp__post-submit" onClick={submitReply} disabled={saving}>
                {saving ? '...' : 'Відповісти'}
              </button>
              <button className="bdp__post-cancel" onClick={() => setReplying(false)}>Скасувати</button>
            </div>
          </div>
        ) : (
          <button className="bdp__reply-btn" onClick={() => setReplying(true)}>
            ↩ Відповісти
          </button>
        )
      )}
    </div>
  );
};

const InstallButton = ({ build, onInstall }) => {
  const hasArchive = !!build.archive_url;
  const hasTorrent = !!build.magnet_link;

  if (!hasArchive && !hasTorrent) {
    return (
      <button className="bdp__btn-install" disabled>
        <Loader size={12} className="spin" /> Завантаження...
      </button>
    );
  }

  return (
    <button className="bdp__btn-install" onClick={() => onInstall(build)}>
      <Download size={12} /> Встановити
    </button>
  );
};

const UserScanButton = ({ buildId, dark }) => {
  const [state, setState] = React.useState('idle');
  const [result, setResult] = React.useState(null);

  const SCAN_LABEL = {
    clean:      { text: 'Чисто',      color: '#1B9c85', icon: '✅' },
    suspicious: { text: 'Підозріло',  color: '#f7d060', icon: '⚠️' },
    dangerous:  { text: 'Небезпечно', color: '#e05252', icon: '🔴' },
  };

  const handleClick = async () => {
    setState('loading');
    try {
      await axios.post(`${API}/builds/${buildId}/scan-result/`, {}, { headers: auth() });
      const res = await axios.get(`${API}/builds/${buildId}/scan-result/`, { headers: auth() });
      if (res.data.status === null) {
        setState('not_scanned');
      } else {
        setResult(res.data);
        setState('result');
      }
    } catch (err) {
      if (err.response?.data?.error === 'no_access' || err.response?.data?.error === 'no_credits') {
        setState('no_access');
      } else {
        setState('idle');
      }
    }
  };

  if (state === 'result' && result) {
    const s = SCAN_LABEL[result.status];
    return (
      <span style={{ fontSize: '0.75rem', color: s.color, fontWeight: 600 }}>
        {s.icon} {s.text} ({result.engines_detected}/{result.engines_total})
      </span>
    );
  }

  if (state === 'not_scanned') {
    return <span style={{ fontSize: '0.72rem', color: '#7a8aab' }}>🔍 Сканування ще не проводилось</span>;
  }

  if (state === 'no_access') {
    return (
      <span style={{ fontSize: '0.72rem', color: '#f7d060' }}>
        🔒 Потрібен Pro план або покупка
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      style={{
        fontSize: '0.73rem', padding: '4px 10px', borderRadius: '7px',
        border: '1px solid rgba(108,155,207,0.25)', background: 'rgba(108,155,207,0.08)',
        color: '#6c9bcf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
      }}
    >
      {state === 'loading' ? <Loader size={12} className="spin" /> : '🔍'} Перевірити на віруси
    </button>
  );
};

const BuildDetailPanel = ({ build, dark, onClose, onInstall, onAnalyze, analyzing, token, onBuildUpdate, addToast }) => {
  const [tab, setTab] = useState('FILES');
  const [files, setFiles] = useState(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [filePage, setFilePage] = useState(1);
  const [codeFile, setCodeFile] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [posts, setPosts] = useState(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postText, setPostText] = useState('');
  const [reviews, setReviews] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myScore, setMyScore] = useState(build.user_review?.score || 0);
  const [myText, setMyText] = useState(build.user_review?.text || '');
  const [reviewSaving, setReviewSaving] = useState(false);

  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const bgCard = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(132,139,200,0.18)';
  const authHdr = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    setFolderPath('');
    setFilePage(1);
    setFiles(null);
    setCodeFile(null);
  }, [build.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateFolder = (newPath) => {
    setFolderPath(newPath);
    setFilePage(1);
    setFiles(null);
    setCodeFile(null);
  };

  useEffect(() => {
    if (tab === 'FILES' && files === null && !filesLoading) {
      setFilesLoading(true);
      axios.get(`${API}/builds/${build.id}/files/`, { params: { folder: folderPath, page: filePage, page_size: 100 } })
        .then(r => setFiles(r.data))
        .catch(e => setFiles({ error: e.response?.data?.error || 'Помилка завантаження' }))
        .finally(() => setFilesLoading(false));
    }
    if (tab === 'POSTS' && posts === null) {
      setPostsLoading(true);
      axios.get(`${API}/builds/${build.id}/posts/`)
        .then(r => setPosts(r.data))
        .catch(() => setPosts([]))
        .finally(() => setPostsLoading(false));
    }
    if (tab === 'REVIEWS' && reviews === null) {
      setReviewsLoading(true);
      axios.get(`${API}/builds/${build.id}/reviews/`)
        .then(r => setReviews(r.data))
        .catch(() => setReviews([]))
        .finally(() => setReviewsLoading(false));
    }
  }, [tab, folderPath, filePage, build.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const readCode = (file) => {
    setCodeFile(null);
    setCodeLoading(true);
    axios.get(`${API}/builds/${build.id}/files/read/?path=${encodeURIComponent(file.path)}`)
      .then(r => setCodeFile({ name: file.name, content: r.data.content, ext: r.data.ext }))
      .catch(e => setCodeFile({ name: file.name, content: `// Помилка: ${e.response?.data?.error || 'невідома'}`, ext: '.txt' }))
      .finally(() => setCodeLoading(false));
  };

  const submitPost = async () => {
    if (!postText.trim()) return;
    try {
      const r = await axios.post(`${API}/builds/${build.id}/posts/`, { text: postText }, { headers: authHdr });
      setPosts(prev => [r.data, ...(prev || [])]);
      setPostText('');
    } catch {}
  };

  const submitReview = async () => {
    if (!myScore) return;
    setReviewSaving(true);
    try {
      await axios.post(`${API}/builds/${build.id}/reviews/`, { score: myScore, text: myText }, { headers: authHdr });
      const [revRes, buildRes] = await Promise.all([
        axios.get(`${API}/builds/${build.id}/reviews/`),
        axios.get(`${API}/builds/${build.id}/`),
      ]);
      setReviews(revRes.data);
      if (onBuildUpdate) onBuildUpdate(buildRes.data);
    } catch {}
    setReviewSaving(false);
  };

  const deleteReview = async () => {
    try {
      await axios.delete(`${API}/builds/${build.id}/reviews/delete/`, { headers: authHdr });
      setMyScore(0);
      setMyText('');
      const [revRes, buildRes] = await Promise.all([
        axios.get(`${API}/builds/${build.id}/reviews/`),
        axios.get(`${API}/builds/${build.id}/`),
      ]);
      setReviews(revRes.data);
      if (onBuildUpdate) onBuildUpdate(buildRes.data);
    } catch {}
  };

  const VIEWABLE = ['.lua', '.cs', '.js', '.txt', '.cfg', '.ini', '.json', '.xml'];
  const tabIcons = {
    FILES: <File size={13} />, IMAGES: <ImageIcon size={13} />,
    POSTS: <MessageSquare size={13} />, REVIEWS: <ThumbsUp size={13} />,
  };
  const tabCounts = {
    FILES: files?.total_files !== undefined ? `${files.total_files}` : '',
    IMAGES: build.images?.length || 0,
    POSTS: posts ? `${posts.length}` : (build.post_count || 0),
    REVIEWS: reviews ? `${reviews.length}` : (build.review_count || 0),
  };

  const cover = build.images?.find(i => i.is_cover) || build.images?.[0];

  return (
    <div className={`bdp ${theme}`}>
      <div className={`bdp__header ${theme}`}>
        {cover
          ? <img src={cover.image} alt={build.title} className="bdp__thumb" />
          : <div className={`bdp__thumb-empty ${theme}`}>📦</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="bdp__title" style={{ color: textColor }}>{build.title}</p>
          <p className="bdp__rating" style={{ color: subColor }}>
            ★ {build.rating} · {build.review_count} {build.review_count === 1 ? 'оцінка' : 'оцінок'}
          </p>
          <div style={{ marginTop: '0.4rem' }}>
            <UserScanButton buildId={build.id} dark={dark} />
          </div>
        </div>
        <div className="bdp__hactions">
          <InstallButton build={build} onInstall={onInstall} />
          <button className={`bdp__btn-icon bdp__btn-icon--ai ${theme}`}
            onClick={() => { onAnalyze(build); onClose(); }}>
            <Bot size={14} />
          </button>
          <button className={`bdp__btn-icon bdp__btn-icon--close ${theme}`} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={`bdp__tabs ${theme}`}>
        {TABS.map(t => (
          <button key={t}
            className={`bdp__tab ${tab === t ? 'active' : 'inactive'}`}
            onClick={() => setTab(t)}>
            {tabIcons[t]} {t}
            {tabCounts[t] !== '' && (
              <span className={`bdp__tab-count ${tab === t ? 'active' : `inactive ${theme}`}`}>
                {tabCounts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bdp__body">
        {tab === 'FILES' && (
          <>
            {codeFile ? (
              <div>
                <button className="bdp__code-back" onClick={() => setCodeFile(null)}>← Назад до файлів</button>
                <p className="bdp__code-filename" style={{ color: subColor }}>{codeFile.name}</p>
                <pre className="bdp__code-pre">{codeFile.content}</pre>
              </div>
            ) : (
              <>
                <div className="bdp__breadcrumb">
                  <button className="bdp__crumb"
                    onClick={() => navigateFolder('')}
                    style={{ color: folderPath ? '#6c9bcf' : textColor, fontWeight: folderPath ? 400 : 600 }}>
                    📦 Архів
                  </button>
                  {folderPath && folderPath.split('/').map((part, i, arr) => {
                    const pathTo = arr.slice(0, i + 1).join('/');
                    const isLast = i === arr.length - 1;
                    return (
                      <span key={pathTo} className="bdp__crumb-group">
                        <span className="bdp__crumb-sep" style={{ color: subColor }}>/</span>
                        <button className="bdp__crumb"
                          onClick={() => !isLast && navigateFolder(pathTo)}
                          style={{ color: isLast ? textColor : '#6c9bcf', cursor: isLast ? 'default' : 'pointer', fontWeight: isLast ? 600 : 400 }}>
                          {part}
                        </button>
                      </span>
                    );
                  })}
                  {files?.total_files !== undefined && (
                    <span className="bdp__crumb-total" style={{ color: subColor }}>
                      {files.total_files} файлів
                    </span>
                  )}
                </div>

                {filesLoading ? (
                  <div className="bdp__loader"><Loader size={22} color="#6c9bcf" className="spin" /></div>
                ) : files?.error ? (
                  <p className="bdp__empty" style={{ color: '#ff0060' }}>⚠ {files.error}</p>
                ) : !files?.items?.length ? (
                  <p className="bdp__empty" style={{ color: subColor }}>Папка порожня</p>
                ) : (
                  <div className="bdp__file-list">
                    {files.items.map((item) => {
                      if (item.type === 'dir') {
                        return (
                          <div key={item.path} className="bdp__file-row bdp__file-row--dir"
                            style={{ background: bgCard, border, cursor: 'pointer' }}
                            onClick={() => navigateFolder(item.path)}>
                            <span className="bdp__dir-icon">📁</span>
                            <span className="bdp__file-name" style={{ color: textColor }}>{item.name}</span>
                            <span className="bdp__file-size" style={{ color: subColor }}>{item.count} файлів</span>
                            <ChevronRight size={13} color={subColor} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                          </div>
                        );
                      }
                      const isViewable = VIEWABLE.includes(item.ext);
                      const kb = (item.size / 1024).toFixed(1);
                      return (
                        <div key={item.path} className="bdp__file-row" style={{ background: bgCard, border }}>
                          <Code size={13} color={isViewable ? '#6c9bcf' : subColor} style={{ flexShrink: 0 }} />
                          <span className="bdp__file-name" style={{ color: textColor }}>{item.name}</span>
                          <span className="bdp__file-size" style={{ color: subColor }}>{kb} KB</span>
                          {isViewable && (
                            <button className="bdp__view-btn" onClick={() => readCode(item)}>Переглянути</button>
                          )}
                        </div>
                      );
                    })}

                    {(files.has_more || filePage > 1) && (
                      <div className="bdp__pagination">
                        {filePage > 1 && (
                          <button className="bdp__page-btn"
                            onClick={() => { setFilePage(p => p - 1); setFiles(null); }}>
                            ← Попередні
                          </button>
                        )}
                        <span className="bdp__page-info" style={{ color: subColor }}>
                          Стор. {filePage}{files.total_in_folder > 0 && ` · ${files.total_in_folder} файлів`}
                        </span>
                        {files.has_more && (
                          <button className="bdp__page-btn"
                            onClick={() => { setFilePage(p => p + 1); setFiles(null); }}>
                            Наступні →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {codeLoading && <div className="bdp__loader"><Loader size={22} color="#6c9bcf" className="spin" /></div>}
          </>
        )}

        {tab === 'IMAGES' && (
          build.images?.length > 0 ? (
            <div className="bdp__gallery">
              {build.images.map(img => (
                <img key={img.id}
                  src={img.image}
                  alt={`${build.title} — скріншот ${img.id}`}
                  className="bdp__gallery-img"
                  onClick={() => window.open(img.image, '_blank')}
                />
              ))}
            </div>
          ) : <p className="bdp__empty" style={{ color: subColor }}>Зображень немає</p>
        )}

        {tab === 'POSTS' && (
          <div>
            {token && (
              <div className="bdp__post-form" style={{ background: bgCard, border }}>
                <textarea className="bdp__post-textarea" value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="Написати коментар..." rows={3} style={{ color: textColor }} />
                <div className="bdp__post-footer">
                  <button className="bdp__post-submit" onClick={submitPost}>Надіслати</button>
                </div>
              </div>
            )}

            {postsLoading ? (
              <div className="bdp__loader"><Loader size={20} color="#6c9bcf" className="spin" /></div>
            ) : posts?.length === 0 ? (
              <p className="bdp__empty" style={{ color: subColor }}>Коментарів ще немає</p>
            ) : (
              <div className="bdp__post-list">
                {posts?.map(p => (
                  <PostItem key={p.id} post={p} dark={dark} token={token}
                    textColor={textColor} subColor={subColor} bgCard={bgCard} border={border}
                    buildId={build.id}
                    onDeleted={(id) => setPosts(prev => prev.filter(x => x.id !== id))}
                    onEdited={(updated) => setPosts(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    onReplied={(postId, reply) => setPosts(prev => prev.map(x =>
                      x.id === postId ? { ...x, replies: [...(x.replies || []), reply] } : x
                    ))}
                    onReplyDeleted={(postId, replyId) => setPosts(prev => prev.map(x =>
                      x.id === postId ? { ...x, replies: x.replies.filter(r => r.id !== replyId) } : x
                    ))}
                    addToast={addToast}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'REVIEWS' && (
          <div>
            {token && (
              <div className="bdp__review-form" style={{ background: bgCard, border }}>
                <p className="bdp__review-label" style={{ color: textColor }}>
                  {build.user_review ? 'Ваш відгук' : 'Залишити відгук'}
                </p>
                <StarPicker value={myScore} onChange={setMyScore} />
                <textarea className="bdp__review-textarea" value={myText}
                  onChange={e => setMyText(e.target.value)}
                  placeholder="Текст відгуку (необов'язково)..." rows={2} style={{ color: textColor }} />
                <div className="bdp__review-actions">
                  {build.user_review && (
                    <button className="bdp__review-del" onClick={deleteReview}>Видалити</button>
                  )}
                  <button
                    className={`bdp__review-save ${myScore ? 'active' : `inactive ${theme}`}`}
                    onClick={submitReview}
                    disabled={!myScore || reviewSaving}>
                    {reviewSaving ? '...' : build.user_review ? 'Оновити' : 'Зберегти'}
                  </button>
                </div>
              </div>
            )}
            {reviewsLoading ? (
              <div className="bdp__loader"><Loader size={20} color="#6c9bcf" className="spin" /></div>
            ) : reviews?.length === 0 ? (
              <p className="bdp__empty" style={{ color: subColor }}>Відгуків ще немає</p>
            ) : (
              <div className="bdp__review-list">
                {reviews?.map(r => (
                  <div key={r.id} className="bdp__review-item" style={{ background: bgCard, border }}>
                    <div className="bdp__review-meta">
                      <span className="bdp__review-author">{r.username}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="bdp__review-stars">{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</span>
                        <span className="bdp__review-date" style={{ color: subColor }}>
                          {new Date(r.created_at).toLocaleDateString('uk-UA')}
                        </span>
                      </div>
                    </div>
                    {r.text && <p className="bdp__review-text" style={{ color: textColor }}>{r.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SimilarModal = ({ build, dark, onClose, onInstall, onAnalyze, analyzing }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';

  useEffect(() => {
    axios.get(`${API}/builds/${build.id}/similar/`)
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [build.id]);

  return (
    <div className="similar-overlay" onClick={onClose}>
      <div className={`similar-modal ${theme}`} onClick={e => e.stopPropagation()}>
        <div className={`similar-modal__header ${theme}`}>
          <div>
            <p className="similar-modal__sublabel" style={{ color: subColor }}>Схожі збірки</p>
            <p className="similar-modal__title" style={{ color: textColor }}>{build.title}</p>
          </div>
          <button className="similar-modal__close" onClick={onClose} style={{ color: subColor }}><X size={18} /></button>
        </div>
        <div className="similar-modal__body">
          {loading ? (
            <div className="bdp__loader"><Loader size={22} color="#6c9bcf" className="spin" /></div>
          ) : items.length === 0 ? (
            <p className="bdp__empty" style={{ color: subColor }}>Схожих збірок не знайдено</p>
          ) : items.map(b => {
            const cover = b.images?.find(i => i.is_cover) || b.images?.[0];
            const typeColor = b.build_type === 'script' ? '#1B9c85' : '#6c9bcf';
            const sharedTags = (b.tag_list || []).filter(t => (build.tag_list || []).includes(t));
            return (
              <div key={b.id} className={`similar-item ${theme}`}>
                <div className={`similar-item__thumb ${theme}`}>
                  {cover
                    ? <img src={cover.image} alt={b.title} />
                    : <div className="similar-item__thumb-empty">📦</div>
                  }
                </div>
                <div className="similar-item__info">
                  <p className="similar-item__name" style={{ color: textColor }}>{b.title}</p>
                  <div className="similar-item__tags">
                    {sharedTags.map(t => (
                      <span key={t} className="similar-item__tag"
                        style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44` }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="similar-item__rating" style={{ color: subColor }}>★ {b.rating}</p>
                </div>
                <div className="similar-item__actions">
                  <button className="bdp__btn-install" onClick={() => { onInstall(b); onClose(); }}>
                    <Download size={11} />
                  </button>
                  <button className={`similar-item__btn-ai ${theme}`}
                    disabled={analyzing === b.id}
                    onClick={() => { onAnalyze(b); onClose(); }}>
                    <Bot size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const BuildCard = ({ build, dark, selected, onSelect, onInstall, onFavoriteToggle, onAnalyze, analyzing, onOpenProfile, onUpsell}) => {
  const [descExpanded, setDescExpanded] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const LIMIT = 110;
  const longDesc = build.description?.length > LIMIT;
  const cover = build.images?.find(i => i.is_cover) || build.images?.[0];
  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const typeColor = build.build_type === 'script' ? '#1B9c85' : '#6c9bcf';
  const typeLabel = build.build_type === 'script' ? 'Скрипт' : 'Збірка';
  const uploading = !build.archive_url && !build.magnet_link;

  return (
    <>
      <div className={`bcard ${theme}${selected ? ' bcard--selected' : ''}`}>
        <div className={`bcard__cover ${theme}`} onClick={() => onSelect(build)}>
          {cover
            ? <img src={cover.image} alt={build.title} />
            : <div className={`bcard__cover-empty ${theme}`}>📦</div>
          }

          <RatingBadge rating={build.rating} reviewCount={build.review_count} />

          <span className="bcard__badge"
            style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44` }}>
            {typeLabel}
          </span>
        </div>

        <div className="bcard__body">
          <h3 className="bcard__title" style={{ color: textColor }}>{build.title}</h3>
          {build.author_name && (
            <span style={{ fontSize: '0.7rem', color: subColor }}>
              <UserLink username={build.author_name} dark={dark} onOpenProfile={onOpenProfile} />
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <StarRating value={build.rating} />
              <span style={{
              fontSize: '0.68rem',
              color: subColor,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}>
              <Download size={11} /> {build.download_count ?? 0}
            </span>
          </div>
          <button className="bcard__fav" onClick={e => { e.stopPropagation(); onFavoriteToggle(build.id); }}>
            <Star size={13} fill={build.is_favorite ? '#f7d060' : 'none'} color={build.is_favorite ? '#f7d060' : 'rgba(255,255,255,0.8)'} />
          </button>
          {build.description && (
            <div>
              <p className="bcard__desc" style={{ color: subColor }}>
                {descExpanded || !longDesc ? build.description : build.description.slice(0, LIMIT) + '…'}
              </p>
              {longDesc && (
                <button className="bcard__read-more" onClick={e => { e.stopPropagation(); setDescExpanded(v => !v); }}>
                  {descExpanded ? <><ChevronUp size={11} />Згорнути</> : <><ChevronDown size={11} />Читати далі</>}
                </button>
              )}
            </div>
          )}
          {build.tag_list?.length > 0 && <TagList tags={build.tag_list} dark={dark} />}

          <div className="bcard__actions">
            <button
              className={`bcard__install${uploading ? ' bcard__install--uploading' : ''}`}
              onClick={e => {
                e.stopPropagation();
                if (uploading) return;
                if (build.is_premium_only) { onUpsell && onUpsell('premium'); return; }
                onInstall(build);
              }}
              disabled={uploading}>
              {uploading
                ? <><Loader size={13} className="spin" /> Завантаження...</>
                : <><Download size={13} /> Встановити</>
              }
            </button>
            <button className={`bcard__icon-btn bcard__icon-btn--ai ${theme}`}
              disabled={analyzing === build.id} title="Перевірити сумісність"
              onClick={e => { e.stopPropagation(); onAnalyze(build); }}>
              {analyzing === build.id ? <Loader size={14} className="spin" /> : <Bot size={14} />}
            </button>
            <button className={`bcard__icon-btn bcard__icon-btn--similar ${theme}`}
              title="Схожі збірки"
              onClick={e => { e.stopPropagation(); setShowSimilar(true); }}>
              <Layers size={14} />
            </button>
            <button className={`bcard__icon-btn bcard__icon-btn--detail ${theme}${selected ? ' active' : ''}`}
              title="Файли, пости, відгуки"
              onClick={() => onSelect(selected ? null : build)}>
              <MessageSquare size={14} />
            </button>
          </div>
        </div>
      </div>
      {showSimilar && (
        <SimilarModal build={build} dark={dark} onClose={() => setShowSimilar(false)}
          onInstall={onInstall} onAnalyze={onAnalyze} analyzing={analyzing} />
      )}
    </>
  );
};

const STATUS_MAP = {
  pending: { label: 'На розгляді', bg: 'rgba(247,208,96,0.15)', color: '#f7d060' },
  approved: { label: 'Схвалено', bg: 'rgba(27,156,133,0.15)', color: '#1B9c85' },
  rejected: { label: 'Відхилено', bg: 'rgba(255,0,96,0.12)', color: '#ff0060' },
};

const MySubmissions = ({dark, onUpsell}) => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = dark ? 'dark' : 'light';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const textColor = dark ? '#edeffd' : '#363949';

  useEffect(() => {
    axios.get(`${API}/submissions/`, { headers: auth() })
      .then(r => setSubs(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '1rem', color: subColor }}>
      <Loader size={16} className="spin" />
    </div>
  );
  if (subs.length === 0) return (
    <p style={{ color: subColor, fontSize: '0.8rem', fontFamily: 'Poppins, sans-serif', margin: 0 }}>
      У вас ще немає надісланих заявок.
    </p>
  );

  return (
    <div className="my-sub-list">
      {subs.map(s => {
        const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
        return (
          <div key={s.id} className={`my-sub-item ${theme}`}>
            <div style={{ minWidth: 0 }}>
              <p className="my-sub-title" style={{ color: textColor }}>{s.title}</p>
              <p className="my-sub-meta" style={{ color: subColor }}>
                {s.build_type === 'script' ? 'Скрипт' : 'Збірка'} · {new Date(s.created_at).toLocaleDateString('uk-UA')}
              </p>
              {s.status === 'rejected' && s.rejection_reason && (
                <p className="my-sub-reason">Причина: {s.rejection_reason}</p>
              )}
            </div>
            <span className="my-sub-badge" style={{ background: st.bg, color: st.color }}>
              <span className="my-sub-dot" style={{ background: st.color }} />
              {st.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const SubmissionForm = ({ dark, onSuccess, addToast, onUpsell }) => {
  const [form, setForm] = useState({ title: '', description: '', build_type: 'build', tags: '', video_url: '' });
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const subColor = dark ? '#a3bdcc' : '#677483';
  const textColor = dark ? '#edeffd' : '#363949';
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(108,155,207,0.05)';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(108,155,207,0.25)';
  const inputStyle = { background: inputBg, border: `1.5px solid ${inputBorder}`, color: textColor };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Прикріпіть архів збірки'); return; }
    setSending(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('source_file', file);
      if (cover) fd.append('cover_image', cover);
      await axios.post(`${API}/submissions/`, fd, { headers: { ...auth(), 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (err) {
    const detail = err.response?.data;
    let message = 'Помилка при надсиланні';
    if (Array.isArray(detail) && detail.length > 0) {
      message = detail[0];
    } else if (typeof detail === 'string') {
      message = detail;
    } else if (detail?.detail) {
      message = detail.detail;
    } else if (detail?.non_field_errors?.[0]) {
      message = detail.non_field_errors[0];
    }
    setError(message);
    }
  };

  return (
    <form className="sub-form" onSubmit={handleSubmit}>
      <div className="sub-form__grid2">
        <div className="sub-form__field">
          <label className="sub-form__label" style={{ color: subColor }}>Назва *</label>
          <input required className="sub-form__input" style={inputStyle} placeholder="Назва збірки або скрипту"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="sub-form__field">
          <label className="sub-form__label" style={{ color: subColor }}>Тип *</label>
          <select className="sub-form__select" style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.build_type} onChange={e => setForm(f => ({ ...f, build_type: e.target.value }))}>
            <option value="build">Збірка</option>
            <option value="script">Скрипт</option>
          </select>
        </div>
      </div>
      <div className="sub-form__field">
        <label className="sub-form__label" style={{ color: subColor }}>Опис</label>
        <textarea className="sub-form__textarea" style={{ ...inputStyle, minHeight: '80px' }}
          placeholder="Що входить у збірку, для чого призначена..."
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="sub-form__grid2">
        <div className="sub-form__field">
          <label className="sub-form__label" style={{ color: subColor }}>Теги (через кому)</label>
          <input className="sub-form__input" style={inputStyle} placeholder="Low-PC, Winter, Realistic"
            value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
        </div>
        <div className="sub-form__field">
          <label className="sub-form__label" style={{ color: subColor }}>YouTube посилання</label>
          <input className="sub-form__input" style={inputStyle} placeholder="https://youtube.com/..."
            value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} />
        </div>
      </div>
      <div className="sub-form__grid2">
        <div className="sub-form__field">
          <label className="sub-form__label" style={{ color: subColor }}>Архів збірки * (.zip/.rar)</label>
          <ImageDropZone onFile={f => { if (/\.(zip|rar|7z)$/i.test(f.name)) setFile(f); }}>
            {(dragging) => (
              <label className="sub-form__file-label"
                style={{
                  background: dragging ? 'rgba(108,155,207,0.12)' : inputBg,
                  border: `1.5px dashed ${file ? '#1B9c85' : dragging ? '#6c9bcf' : inputBorder}`,
                  color: file ? '#1B9c85' : dragging ? '#6c9bcf' : subColor,
                }}>
                <Upload size={14} /> {file ? file.name : dragging ? 'Відпустіть файл...' : 'Обрати або перетягнути'}
                <input type="file" accept=".zip,.rar,.7z" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
              </label>
            )}
          </ImageDropZone>
        </div>
        <div className="sub-form__field">
          <label className="sub-form__label" style={{ color: subColor }}>Обкладинка (необов'язково)</label>
          <ImageDropZone onFile={f => { if (f.type.startsWith('image/')) setCover(f); }}>
            {(dragging) => (
              <label className="sub-form__file-label"
                style={{
                  background: dragging ? 'rgba(108,155,207,0.12)' : inputBg,
                  border: `1.5px dashed ${cover ? '#6c9bcf' : dragging ? '#6c9bcf' : inputBorder}`,
                  color: cover ? '#6c9bcf' : dragging ? '#6c9bcf' : subColor,
                }}>
                <FileText size={14} /> {cover ? cover.name : dragging ? 'Відпустіть...' : 'Обрати або перетягнути'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCover(e.target.files[0])} />
              </label>
            )}
          </ImageDropZone>
        </div>
      </div>
      {error && <div className="sub-form__error"><AlertCircle size={13} /> {error}</div>}
      <button type="submit" disabled={sending} className={`sub-form__submit ${sending ? 'sending' : 'ready'}`}>
        {sending ? <Loader size={15} className="spin" /> : <Plus size={15} />}
        {sending ? 'Надсилання...' : 'Надіслати на модерацію'}
      </button>
    </form>
  );
};

const SORT_OPTIONS = [
  { value: 'rating_desc', label: 'За оцінкою: від високої до низької' },
  { value: 'rating_asc', label: 'За оцінкою: від низької до високої' },
  { value: 'reviews_desc', label: 'За кількістю відгуків: від більшої до меншої' },
  { value: 'reviews_asc', label: 'За кількістю відгуків: від меншої до більшої' },
];
const MIN_REVIEWS_OPTIONS = [
  { value: '', label: 'Будь-яка кількість' },
  { value: '5', label: '5+' },
  { value: '10', label: '10+' },
  { value: '25', label: '25+' },
  { value: '50', label: '50+' },
];
 
const RatingTab = ({ dark, onInstall, onAnalyze, analyzingId, specsExist, onAnalyzeRequest, onSelect, selectedBuild, onUpsell }) => {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('rating_desc');
  const [minReviews, setMinReviews] = useState('');
  const [ratingMin, setRatingMin] = useState(1.0);
  const [ratingMax, setRatingMax] = useState(5.0);
 
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(132,139,200,0.15)';
  const inputBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(108,155,207,0.07)';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(108,155,207,0.22)';
 
  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (minReviews) params.set('min_reviews', minReviews);
      if (ratingMin > 1.0) params.set('rating_min', ratingMin);
      if (ratingMax < 5.0) params.set('rating_max', ratingMax);
      const res = await axios.get(`${API}/builds/?${params}`, {
        headers: getToken() ? auth() : {},
      });
      setBuilds(res.data);
    } catch {}
    finally { setLoading(false); }
  }, [sort, typeFilter, minReviews, ratingMin, ratingMax]);
 
  useEffect(() => { fetch(); }, [fetch]);
 
  const handleFavorite = async (buildId) => {
    try {
      const res = await axios.post(`${API}/builds/${buildId}/favorite/`, {}, { headers: auth() });
      setBuilds(prev => prev.map(b => b.id === buildId ? { ...b, is_favorite: res.data.is_favorite } : b));
    } catch {}
  };
 
  const handleAnalyze = async (build) => {
    if (!specsExist) { onAnalyzeRequest({ type: 'no_specs' }); return; }
    try {
      const res = await axios.post(`${API}/builds/${build.id}/analyze_async/`, {}, { headers: auth() });
      onAnalyzeRequest({ type: 'queued', taskId: res.data.task_id, buildTitle: build.title });
    } catch (err) {
      onAnalyzeRequest({ type: 'error', message: err.response?.data?.error || 'Помилка' });
    }
  };
 
  const selectStyle = {
    padding: '0.45rem 0.75rem', borderRadius: '0.6rem', fontSize: '0.78rem',
    fontFamily: 'Poppins, sans-serif', background: inputBg, color: textColor,
    border: `1px solid ${inputBorder}`, outline: 'none', cursor: 'pointer',
  };
  const pillStyle = (active) => ({
    padding: '0.35rem 0.85rem', borderRadius: '0.6rem', fontSize: '0.78rem',
    fontFamily: 'Poppins, sans-serif', border: 'none', cursor: 'pointer',
    background: active ? 'rgba(108,155,207,0.18)' : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(108,155,207,0.07)'),
    color: active ? '#6c9bcf' : subColor, fontWeight: active ? 600 : 400,
  });
 
  return (
    <div>
      <div style={{
        background: cardBg, border, borderRadius: '1rem',
        padding: '1rem 1.1rem', marginBottom: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: subColor, fontWeight: 500 }}>Тип:</span>
          {[['all','Всі'], ['build','Збірки'], ['script','Скрипти']].map(([v, l]) => (
            <button key={v} style={pillStyle(typeFilter === v)} onClick={() => setTypeFilter(v)}>{l}</button>
          ))}
        </div>
 
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: subColor, fontWeight: 500 }}>Сортування:</span>
          <select style={selectStyle} value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
 
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: subColor, fontWeight: 500 }}>Мін. відгуків:</span>
          {MIN_REVIEWS_OPTIONS.map(o => (
            <button key={o.value} style={pillStyle(minReviews === o.value)} onClick={() => setMinReviews(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
 
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: subColor, fontWeight: 500 }}>Оцінка від:</span>
          <input type="range" min={1.0} max={5.0} step={0.5} value={ratingMin}
            onChange={e => setRatingMin(parseFloat(e.target.value))}
            style={{ width: '100px', accentColor: '#6c9bcf' }} />
          <span style={{ fontSize: '0.78rem', color: '#6c9bcf', fontWeight: 600 }}>{ratingMin.toFixed(1)}</span>
          <span style={{ fontSize: '0.72rem', color: subColor, fontWeight: 500 }}>до:</span>
          <input type="range" min={1.0} max={5.0} step={0.5} value={ratingMax}
            onChange={e => setRatingMax(parseFloat(e.target.value))}
            style={{ width: '100px', accentColor: '#6c9bcf' }} />
          <span style={{ fontSize: '0.78rem', color: '#6c9bcf', fontWeight: 600 }}>{ratingMax.toFixed(1)}</span>
        </div>
      </div>
 
      {loading ? (
        <div className="bc-loader"><Loader size={24} className="spin" color="#6c9bcf" /></div>
      ) : builds.length === 0 ? (
        <p style={{ color: subColor, textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>
          Нічого не знайдено за вибраними фільтрами
        </p>
      ) : (
        <div className="bc-grid">
          {builds.map(b => (
            <BuildCard key={b.id} build={b} dark={dark}
              selected={selectedBuild?.id === b.id}
              onSelect={onSelect}
              onInstall={onInstall}
              onFavoriteToggle={handleFavorite}
              onAnalyze={handleAnalyze}
              analyzing={analyzingId}
              onUpsell={onUpsell}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FeaturedSection = ({ dark, onInstall, onAnalyze, analyzingId, onSelect, selectedBuild, onOpenProfile, onUpsell}) => {
  const [featured, setFeatured] = React.useState([]);

  React.useEffect(() => {
    axios.get(`${API}/builds/featured/`, { headers: getToken() ? auth() : {} })
      .then(r => setFeatured(r.data))
      .catch(() => {});
  }, []);

  if (featured.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f7d060' }}>⭐ Рекомендовані</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(247,208,96,0.2)' }} />
      </div>
      <div className="bc-grid">
        {featured.map(b => (
          <BuildCard 
            key={b.id} 
            build={b} 
            dark={dark}
            selected={selectedBuild?.id === b.id}
            onSelect={onSelect}
            onInstall={onInstall}
            onFavoriteToggle={() => {}}
            onAnalyze={onAnalyze}
            analyzing={analyzingId}
            onOpenProfile={onOpenProfile}
            onUpsell={onUpsell}
          />
        ))}
      </div>
    </div>
  );
};


const BuildCatalog = ({ dark, onAnalyzeRequest, specsExist, addToast, onOpenProfile, onUpsell}) => {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState(null);
  const [activeType, setActiveType] = useState('all');
  const [activeTag, setActiveTag] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [installBuild, setInstallBuild] = useState(null);
  const handleInstall = useCallback((build) => {
    setInstallBuild(build);
    axios.post(`${API}/builds/${build.id}/download/`, {}, {
      headers: getToken() ? auth() : {},
    }).then(res => {
      setBuilds(prev => prev.map(b =>
        b.id === build.id ? { ...b, download_count: res.data.download_count } : b
      ));
    }).catch(() => {});
  }, []);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [subSection, setSubSection] = useState('list');
  const [subOpen, setSubOpen] = useState(false);

  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';

  const fetchBuilds = useCallback(async (type = 'all', tag = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type === 'favorites') {
        params.set('favorites', '1');
      } else if (type !== 'all') {
        params.set('type', type);
      }
      if (tag) params.set('tag', tag);
      const res = await axios.get(`${API}/builds/?${params}`, { headers: getToken() ? auth() : {} });
      setBuilds(res.data);
      setAllTags([...new Set(res.data.flatMap(b => b.tag_list || []))]);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('vortex_token');
        if (type !== 'favorites') {
          try {
            const params = new URLSearchParams();
            if (type !== 'all') params.set('type', type);
            if (tag) params.set('tag', tag);
            const res = await axios.get(`${API}/builds/?${params}`);
            setBuilds(res.data);
            setAllTags([...new Set(res.data.flatMap(b => b.tag_list || []))]);
          } catch {}
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBuilds(activeType, activeTag); }, [activeType, activeTag, fetchBuilds]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) { fetchBuilds(activeType, activeTag); return; }
    setAiSearching(true);
    try {
      const res = await axios.get(`${API}/builds/search/?q=${encodeURIComponent(searchQuery)}`, { headers: auth() });
      setBuilds(res.data.results);
      setCreditsLeft(res.data.credits_left);
    } catch (err) {
      const status = err.response?.status;
      if (status === 402) {
        onUpsell && onUpsell('credits');
      } else if (status === 401) {
        addToast({ type: 'error', message: 'Увійдіть в акаунт для використання AI-пошуку.', duration: 5000 });
      }
    } finally {
      setAiSearching(false);
    }
  };

  const handleFavorite = async (buildId) => {
    try {
      const res = await axios.post(`${API}/builds/${buildId}/favorite/`, {}, { headers: auth() });
      setBuilds(prev => prev.map(b => b.id === buildId ? { ...b, is_favorite: res.data.is_favorite } : b));
    } catch {}
  };

  const handleAnalyze = async (build) => {
    if (!specsExist) { onAnalyzeRequest({ type: 'no_specs' }); return; }
    setAnalyzingId(build.id);
    try {
      const res = await axios.post(`${API}/builds/${build.id}/analyze_async/`, {}, { headers: auth() });
      onAnalyzeRequest({ type: 'queued', taskId: res.data.task_id, buildTitle: build.title });
    } catch (err) {
      onAnalyzeRequest({ type: 'error', message: err.response?.data?.error || 'Помилка запуску аналізу' });
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleSelect = (build) => {
    setSelectedBuild(prev => (prev?.id === build?.id ? null : build));
  };

  const typeFilters = [
    { id: 'all', label: 'Всі' },
    { id: 'build', label: 'Збірки' },
    { id: 'script', label: 'Скрипти' },
    { id: 'rating', label: 'За рейтингом' },
    { id: 'favorites', label: '★ Обрані' },
  ];

  return (
    <div className="bc-page">
      <div className={`bc-left${selectedBuild ? ' bc-left--narrow' : ''}`}>
        <div className="bc-intro">
          <h2 className="bc-heading" style={{ color: textColor }}>Каталог збірок</h2>
          <p className="bc-subheading" style={{ color: subColor }}>Arizona RP — моди та скрипти</p>
        </div>

        <form onSubmit={handleSearch} style={{ marginBottom: '1.2rem' }}>
          <div className={`bc-search-wrap ${theme} ${searchQuery ? 'active' : 'inactive'}`}>
            <div className="bc-search-icon">
              {aiSearching
                ? <Loader size={15} color="#6c9bcf" className="spin" />
                : <Bot size={15} color="#6c9bcf" />
              }
            </div>
            <input type="text"
              className="bc-search-input"
              placeholder='AI-пошук: "збірка для поліції на слабкому ПК"...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ color: textColor }}
            />
            {searchQuery && (
              <button type="button" className={`bc-search-clear ${theme}`}
                onClick={() => { setSearchQuery(''); fetchBuilds(activeType, activeTag); setCreditsLeft(null); }}>
                <X size={11} />
              </button>
            )}
          </div>
          {creditsLeft !== null && (
            <p className={`bc-credits ${creditsLeft <= 1 ? 'warn' : 'ok'}`}>
              {creditsLeft <= 0 ? '⚠ AI-кредити вичерпано' : `AI-кредити: ${creditsLeft} залишилось`}
            </p>
          )}
        </form>

        <div className="bc-filters">
          <SlidersHorizontal size={14} color={subColor} />
          {typeFilters.map(f => (
            <button key={f.id}
              className={`bc-pill${activeType === f.id ? ' bc-pill--active' : ''}`}
              style={activeType !== f.id ? { background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(108,155,207,0.08)', color: subColor } : {}}
              onClick={() => { setActiveType(f.id); setSearchQuery(''); }}>
              {f.label}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="bc-tags">
            <Flame size={12} color={subColor} />
            {activeTag && (
              <button className="bc-tag-btn"
                style={{ background: 'rgba(255,0,96,0.1)', color: '#ff0060', border: 'none' }}
                onClick={() => setActiveTag('')}>
                × Скинути
              </button>
            )}
            {allTags.map(tag => (
              <button key={tag} className="bc-tag-btn"
                style={{
                  background: activeTag === tag ? 'rgba(108,155,207,0.2)' : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(132,139,200,0.1)'),
                  color: activeTag === tag ? '#6c9bcf' : subColor,
                  border: activeTag === tag ? '1px solid rgba(108,155,207,0.4)' : '1px solid transparent',
                  fontWeight: activeTag === tag ? 600 : 400,
                }}
                onClick={() => { setActiveTag(activeTag === tag ? '' : tag); setSearchQuery(''); }}>
                {tag}
              </button>
            ))}
          </div>
        )}

        <FeaturedSection 
          dark={dark} 
          onInstall={handleInstall} 
          onAnalyze={handleAnalyze} 
          analyzingId={analyzingId} 
          onSelect={handleSelect} 
          selectedBuild={selectedBuild}
          onOpenProfile={onOpenProfile}
          onUpsell={onUpsell}
        />

        {activeType === 'rating' ? (
          <RatingTab
            dark={dark}
            onInstall={handleInstall}
            onAnalyze={handleAnalyze}
            analyzingId={analyzingId}
            specsExist={specsExist}
            onAnalyzeRequest={onAnalyzeRequest}
            onSelect={handleSelect}
            selectedBuild={selectedBuild}
          />
        ) : loading || aiSearching ? (
          <div className="bc-loading" style={{ color: subColor }}>
            <Loader size={22} color="#6c9bcf" className="spin" />
            <span style={{ fontSize: '0.85rem' }}>{aiSearching ? 'ШІ аналізує запит...' : 'Завантаження...'}</span>
          </div>
        ) : builds.length === 0 ? (
          <div className="bc-empty" style={{ color: subColor }}>
            <div className="bc-empty-icon">🔍</div>
            <p className="bc-empty-text">Нічого не знайдено. Спробуйте змінити фільтри.</p>
          </div>
        ) : (
          <div className="bc-grid">
            {builds.map(b => (
              <BuildCard key={b.id} build={b} dark={dark}
                selected={selectedBuild?.id === b.id}
                onSelect={handleSelect}
                onInstall={handleInstall}
                onFavoriteToggle={handleFavorite}
                onAnalyze={handleAnalyze}
                analyzing={analyzingId}
                onOpenProfile={onOpenProfile}
                onUpsell={onUpsell}
              />
            ))}
          </div>
        )}

        <div className="bc-sub-section"
          style={{ borderTop: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(132,139,200,0.15)' }}>
          <button className="bc-sub-toggle"
            onClick={() => setSubOpen(v => !v)}
            style={{ marginBottom: subOpen ? '1.2rem' : 0 }}>
            <Cpu size={16} color="#6c9bcf" />
            <span className="bc-sub-label" style={{ color: textColor }}>Мої збірки</span>
            <span className="bc-sub-hint" style={{ color: subColor }}>— надішліть власну збірку або скрипт</span>
            <span className="bc-sub-chevron" style={{ color: subColor }}>
              {subOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          <div className="bc-sub-collapse" style={{ gridTemplateRows: subOpen ? '1fr' : '0fr' }}>
            <div className="bc-sub-inner">
              <div className="bc-sub-tabs">
                {[{ id: 'list', label: 'Мої заявки' }, { id: 'form', label: '+ Нова заявка' }].map(t => (
                  <button key={t.id}
                    className={`bc-sub-tab${subSection === t.id ? ' bc-sub-tab--active' : ''}`}
                    style={{
                      background: subSection === t.id ? 'rgba(108,155,207,0.15)' : 'transparent',
                      color: subSection === t.id ? '#6c9bcf' : subColor,
                    }}
                    onClick={() => setSubSection(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
              {subSection === 'form'
                ? <SubmissionForm dark={dark} onSuccess={() => setSubSection('list')} addToast={addToast} onUpsell={onUpsell} />
                : <MySubmissions dark={dark} onUpsell={onUpsell} />
              }
            </div>
          </div>
        </div>
      </div>

      {selectedBuild && (
        <div className="bc-right">
          <BuildDetailPanel
            build={selectedBuild}
            dark={dark}
            onClose={() => setSelectedBuild(null)}
            onInstall={handleInstall}
            onAnalyze={handleAnalyze}
            analyzing={analyzingId}
            token={localStorage.getItem('vortex_token')}
            addToast={addToast}
            onBuildUpdate={(updated) => {
              setBuilds(prev => prev.map(b => b.id === updated.id ? updated : b));
              setSelectedBuild(updated);
            }}
          />
        </div>
      )}

      <InstallModal build={installBuild} dark={dark} onClose={() => setInstallBuild(null)} />
    </div>
  );
};

export default BuildCatalog;