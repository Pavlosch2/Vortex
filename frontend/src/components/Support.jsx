import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  HeadphonesIcon, Paperclip, Send, CheckCircle,
  X, ChevronDown, ChevronUp, MessageSquare, Clock, Loader,
  RefreshCw, InboxIcon, Trash2, Image
} from 'lucide-react';

const API  = 'http://127.0.0.1:8000/api';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });

const StatusBadge = ({ status }) => {
  const map = {
    open:        { label: 'Відкрито',   bg: 'rgba(108,155,207,0.15)', color: '#6c9bcf' },
    in_progress: { label: 'В обробці',  bg: 'rgba(247,208,96,0.15)',  color: '#f7d060' },
    closed:      { label: 'Закрито',    bg: 'rgba(27,156,133,0.15)',  color: '#1B9c85' },
  };
  const s = map[status] || map.open;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      fontSize: '0.7rem', fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};

const timeAgo = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return 'щойно';
  if (diff < 3600)  return `${Math.floor(diff / 60)} хв тому`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
  return new Date(iso).toLocaleDateString('uk-UA');
};

const Lightbox = ({ src, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', animation: 'fadeIn 0.18s ease',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white',
        }}
      >
        <X size={18} />
      </button>
      <img
        src={src}
        alt="Скріншот"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '100%', maxHeight: '90vh',
          borderRadius: '0.75rem',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      />
    </div>
  );
};

const ReplyBubble = ({ reply, dark }) => {
  const [lightbox, setLightbox] = useState(null);
  const isStaff   = reply.is_staff;
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor  = dark ? '#a3bdcc' : '#677483';

  return (
    <>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <div style={{
        display: 'flex',
        flexDirection: isStaff ? 'row' : 'row-reverse',
        gap: '0.6rem', alignItems: 'flex-start',
        marginBottom: '0.8rem',
      }}>
        <div style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
          overflow: 'hidden',
          background: isStaff
            ? 'linear-gradient(135deg, #6c9bcf, #1B9c85)'
            : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(132,139,200,0.15)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700,
          color: isStaff ? 'white' : (dark ? '#a3bdcc' : '#677483'),
        }}>
          {reply.author_avatar
            ? <img src={reply.author_avatar} alt={reply.author_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (reply.author_name || (isStaff ? 'M' : 'U'))[0].toUpperCase()
          }
        </div>
        <div style={{ maxWidth: '75%' }}>
          <div style={{
            padding: reply.image && !reply.message ? '0.4rem' : '0.65rem 0.9rem',
            borderRadius: isStaff ? '0 0.8rem 0.8rem 0.8rem' : '0.8rem 0 0.8rem 0.8rem',
            background: isStaff
              ? 'linear-gradient(135deg, rgba(108,155,207,0.15), rgba(27,156,133,0.12))'
              : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(132,139,200,0.1)'),
            border: isStaff
              ? '1px solid rgba(108,155,207,0.25)'
              : (dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.2)'),
          }}>
            {reply.message && (
              <p style={{ margin: 0, fontSize: '0.83rem', color: textColor, lineHeight: 1.5, marginBottom: reply.image ? '0.5rem' : 0 }}>
                {reply.message}
              </p>
            )}
            {reply.image && (
              <img
                src={reply.image}
                alt="Скріншот"
                onClick={() => setLightbox(reply.image)}
                style={{
                  maxWidth: '220px', maxHeight: '160px',
                  width: '100%', objectFit: 'cover',
                  borderRadius: '0.55rem', cursor: 'zoom-in',
                  display: 'block',
                  border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(132,139,200,0.2)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.target.style.opacity = '0.85'}
                onMouseLeave={e => e.target.style.opacity = '1'}
              />
            )}
          </div>
          <div style={{
            display: 'flex', gap: '0.4rem', alignItems: 'center',
            marginTop: '0.25rem',
            justifyContent: isStaff ? 'flex-start' : 'flex-end',
          }}>
            {isStaff && (
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6c9bcf' }}>Moderator</span>
            )}
            <span style={{ fontSize: '0.65rem', color: subColor }}>{timeAgo(reply.created_at)}</span>
          </div>
        </div>
      </div>
    </>
  );
};

const TicketCard = ({ ticket, dark, onRefresh, addToast }) => {
  const [open, setOpen]           = useState(false);
  const [acting, setActing]       = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [lightbox, setLightbox]   = useState(null);
  const fileInputRef              = useRef(null);

  const textColor = dark ? '#edeffd' : '#363949';
  const subColor  = dark ? '#a3bdcc' : '#677483';
  const cardBg    = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const border    = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.18)';

  const hasReplies = ticket.replies?.length > 0;
  const newReplies = ticket.reply_count > 0 && ticket.status !== 'closed';
  const canSend    = replyText.trim() || replyImage;

  const handleDelete = async () => {
    setActing(true);
    try {
      await axios.delete(`${API}/support/${ticket.id}/delete_ticket/`, { headers: auth() });
      if (addToast) addToast('Звернення видалено', 'success');
      onRefresh();
    } catch (e) {
      if (addToast) addToast(e.response?.data?.error || 'Помилка видалення', 'error');
    } finally { setActing(false); }
  };

  const handleReply = async () => {
    if (!canSend) return;
    setActing(true);
    try {
      const fd = new FormData();
      if (replyText.trim()) fd.append('message', replyText.trim());
      if (replyImage) fd.append('image', replyImage);
      await axios.post(`${API}/support/${ticket.id}/reply/`, fd, {
        headers: { ...auth(), 'Content-Type': 'multipart/form-data' },
      });
      setReplyText('');
      setReplyImage(null);
      if (addToast) addToast('Повідомлення надіслано', 'success');
      onRefresh();
    } catch (e) {
      if (addToast) addToast(e.response?.data?.error || 'Помилка надсилання', 'error');
    } finally { setActing(false); }
  };

  return (
    <>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <div style={{
        background: cardBg, border,
        borderRadius: '1rem', overflow: 'hidden',
        boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(132,139,200,0.1)',
      }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem',
            textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: textColor, fontFamily: 'Poppins, sans-serif' }}>
                {ticket.subject}
              </span>
              <StatusBadge status={ticket.status} />
              {newReplies && (
                <span style={{
                  fontSize: '0.65rem', padding: '2px 7px', borderRadius: 999,
                  background: 'rgba(108,155,207,0.2)', color: '#6c9bcf', fontWeight: 700,
                }}>
                  {ticket.reply_count} відповід{ticket.reply_count === 1 ? 'ь' : 'і'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <Clock size={11} color={subColor} />
              <span style={{ fontSize: '0.7rem', color: subColor, fontFamily: 'Poppins, sans-serif' }}>
                {timeAgo(ticket.created_at)}
              </span>
            </div>
          </div>
          <div style={{ color: subColor, flexShrink: 0 }}>
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {open && (
          <div style={{ borderTop: border, padding: '1.2rem' }}>
            <div style={{
              padding: '0.9rem', borderRadius: '0.7rem', marginBottom: '1.2rem',
              background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(132,139,200,0.06)',
              border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(132,139,200,0.15)',
            }}>
              <p style={{ margin: 0, fontSize: '0.83rem', color: textColor, lineHeight: 1.6, fontFamily: 'Poppins, sans-serif' }}>
                {ticket.message}
              </p>
            </div>

            {ticket.screenshots?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                {ticket.screenshots.map((s, i) => (
                  <img
                    key={i}
                    src={s.image}
                    alt={`Скріншот ${i + 1}`}
                    onClick={() => setLightbox(s.image)}
                    style={{
                      width: 80, height: 60, objectFit: 'cover',
                      borderRadius: '0.5rem', border, cursor: 'zoom-in',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.target.style.opacity = '0.8'}
                    onMouseLeave={e => e.target.style.opacity = '1'}
                  />
                ))}
              </div>
            )}

            {hasReplies && (
              <div style={{ marginBottom: '0.8rem' }}>
                <p style={{ fontSize: '0.72rem', color: subColor, marginBottom: '0.8rem', fontFamily: 'Poppins, sans-serif' }}>
                  <MessageSquare size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Переписка
                </p>
                {ticket.replies.map(r => (
                  <ReplyBubble key={r.id} reply={r} dark={dark} />
                ))}
              </div>
            )}

            {!hasReplies && (
              <p style={{ fontSize: '0.78rem', color: subColor, fontStyle: 'italic', fontFamily: 'Poppins, sans-serif', marginBottom: '0.5rem' }}>
                Відповідей ще немає — ми відповімо якнайшвидше.
              </p>
            )}

            {ticket.status === 'closed' && (
              <div style={{
                marginTop: '0.5rem', padding: '0.6rem 0.9rem', borderRadius: '0.6rem',
                background: 'rgba(27,156,133,0.1)', border: '1px solid rgba(27,156,133,0.2)',
                fontSize: '0.75rem', color: '#1B9c85', fontFamily: 'Poppins, sans-serif',
                marginBottom: '0.8rem',
              }}>
                ✓ Звернення закрито
              </div>
            )}

            {ticket.status !== 'closed' && (
              <div style={{ marginTop: '1rem' }}>
                {replyImage && (
                  <div style={{ marginBottom: '0.5rem', position: 'relative', display: 'inline-block' }}>
                    <img
                      src={URL.createObjectURL(replyImage)}
                      alt="Прев'ю"
                      onClick={() => setLightbox(URL.createObjectURL(replyImage))}
                      style={{
                        height: 72, maxWidth: 140, objectFit: 'cover',
                        borderRadius: '0.55rem', border, cursor: 'zoom-in', display: 'block',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setReplyImage(null)}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        background: '#ff0060', border: 'none', borderRadius: '50%',
                        width: 18, height: 18, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: 'white', padding: 0,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Написати повідомлення..."
                    rows={2}
                    style={{
                      flex: 1, padding: '0.6rem 0.8rem', borderRadius: '0.65rem',
                      resize: 'vertical', minHeight: '60px',
                      background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(108,155,207,0.05)',
                      border: `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(108,155,207,0.25)'}`,
                      color: textColor, fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem',
                      outline: 'none',
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      title="Прикріпити скріншот"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '0.55rem', borderRadius: '0.6rem', border: 'none',
                        background: replyImage
                          ? 'rgba(108,155,207,0.25)'
                          : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(132,139,200,0.1)'),
                        color: replyImage ? '#6c9bcf' : subColor,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Image size={15} />
                    </button>
                    <button
                      onClick={handleReply}
                      disabled={!canSend || acting}
                      style={{
                        padding: '0.55rem 0.9rem', borderRadius: '0.6rem', border: 'none',
                        background: canSend ? 'linear-gradient(135deg,#6c9bcf,#1B9c85)' : (dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'),
                        color: canSend ? 'white' : subColor,
                        cursor: canSend ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontFamily: 'Poppins, sans-serif', fontSize: '0.78rem', fontWeight: 600,
                      }}>
                      {acting ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                      Надіслати
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setReplyImage(f);
                    e.target.value = '';
                  }}
                />
                <p style={{ fontSize: '0.67rem', color: subColor, margin: '0.35rem 0 0', fontFamily: 'Poppins, sans-serif' }}>
                  Ctrl+Enter — надіслати · Можна прикріпити 1 скріншот
                </p>
              </div>
            )}

            {ticket.is_own && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button onClick={handleDelete} disabled={acting} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.45rem 0.85rem', borderRadius: '0.6rem', border: 'none',
                  background: 'rgba(255,0,96,0.08)', color: '#ff0060',
                  cursor: acting ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif', fontWeight: 600,
                }}>
                  {acting ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                  Видалити
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

const SubmitForm = ({ dark, onSuccess, addToast }) => {
  const [form,    setForm]    = useState({ subject: '', message: '' });
  const [files,   setFiles]   = useState([]);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const subColor    = dark ? '#a3bdcc' : '#677483';
  const inputBg     = dark ? 'rgba(255,255,255,0.05)' : 'rgba(108,155,207,0.05)';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(108,155,207,0.25)';
  const textColor   = dark ? '#edeffd' : '#363949';
  const cardBg      = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)';
  const border      = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.2)';

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem', boxSizing: 'border-box',
    background: inputBg, border: `1.5px solid ${inputBorder}`,
    borderRadius: '0.7rem', outline: 'none',
    color: textColor, fontFamily: 'Poppins, sans-serif', fontSize: '0.88rem',
  };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (selected.length + files.length > 3) {
      if (addToast) addToast('Максимум 3 скріншоти', 'error');
      return;
    }
    setFiles(prev => [...prev, ...selected]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('subject', form.subject);
      fd.append('message', form.message);
      files.forEach((f, i) => fd.append(`screenshot_${i}`, f));
      await axios.post(`${API}/support/`, fd, {
        headers: { ...auth(), 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
    } catch (err) {
      if (addToast) addToast(err.response?.data?.detail || 'Помилка надсилання', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <div style={{ background: cardBg, border, borderRadius: '1.2rem', padding: '1.8rem', boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(132,139,200,0.12)' }}>
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '0.7rem', marginBottom: '1.4rem',
          background: 'rgba(247,208,96,0.1)', border: '1px solid rgba(247,208,96,0.3)',
          color: '#f7d060', fontSize: '0.76rem', lineHeight: 1.5, fontFamily: 'Poppins, sans-serif',
        }}>
          ⚠️ Ця форма — лише для проблем із роботою сайту. Питання щодо збірок або гри тут не розглядаються.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 500, color: subColor, marginBottom: '0.35rem', fontFamily: 'Poppins, sans-serif' }}>
              Тема *
            </label>
            <input type="text" required style={inputStyle}
              placeholder="Напр: Не завантажується каталог збірок"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#6c9bcf'}
              onBlur={e  => e.target.style.borderColor = inputBorder}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 500, color: subColor, marginBottom: '0.35rem', fontFamily: 'Poppins, sans-serif' }}>
              Опис проблеми *
            </label>
            <textarea required style={{ ...inputStyle, minHeight: '130px', resize: 'vertical' }}
              placeholder="Опишіть детально що сталося, яка помилка з'явилась..."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#6c9bcf'}
              onBlur={e  => e.target.style.borderColor = inputBorder}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 500, color: subColor, marginBottom: '0.5rem', fontFamily: 'Poppins, sans-serif' }}>
              Скріншоти (необов'язково, макс. 3)
            </label>
            {files.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                {files.map((f, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 56, borderRadius: '0.5rem', overflow: 'hidden', border }}>
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      onClick={() => setLightbox(URL.createObjectURL(f))}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                    />
                    <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', padding: 0 }}>
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < 3 && (
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.9rem', borderRadius: '0.6rem', cursor: 'pointer',
                background: inputBg, border: `1.5px dashed ${inputBorder}`,
                color: subColor, fontSize: '0.78rem', fontFamily: 'Poppins, sans-serif',
              }}>
                <Paperclip size={14} /> Прикріпити скріншот
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
              </label>
            )}
          </div>

          <button type="submit" disabled={sending} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.85rem', borderRadius: '0.8rem', border: 'none',
            background: sending ? 'rgba(108,155,207,0.4)' : 'linear-gradient(135deg, #6c9bcf, #1B9c85)',
            color: 'white', fontFamily: 'Poppins, sans-serif', fontSize: '0.9rem', fontWeight: 600,
            cursor: sending ? 'not-allowed' : 'pointer',
            boxShadow: sending ? 'none' : '0 4px 16px rgba(108,155,207,0.25)',
          }}>
            {sending ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            {sending ? 'Надсилання...' : 'Надіслати звернення'}
          </button>
        </form>
      </div>
    </>
  );
};

const TicketList = ({ dark, onNewTicket, addToast }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const subColor = dark ? '#a3bdcc' : '#677483';

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/support/`, { headers: auth() });
      setTickets(res.data);
    } catch {
      if (addToast) addToast('Не вдалося завантажити звернення', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '160px', gap: '0.7rem', color: subColor, fontFamily: 'Poppins, sans-serif' }}>
      <Loader size={20} color="#6c9bcf" style={{ animation: 'spin 1s linear infinite' }} />
      Завантаження...
    </div>
  );

  if (tickets.length === 0) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: subColor, fontFamily: 'Poppins, sans-serif' }}>
      <InboxIcon size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
      <p style={{ fontSize: '0.88rem', marginBottom: '1.2rem' }}>У вас ще немає звернень</p>
      <button onClick={onNewTicket} style={{
        padding: '0.65rem 1.4rem', borderRadius: '0.7rem', border: 'none',
        background: 'linear-gradient(135deg, #6c9bcf, #1B9c85)', color: 'white',
        cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.85rem',
      }}>
        Створити перше звернення
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.78rem', color: subColor, fontFamily: 'Poppins, sans-serif' }}>
          {tickets.length} {tickets.length === 1 ? 'звернення' : 'звернень'}
        </span>
        <button onClick={fetchTickets} style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: subColor, fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif',
        }}>
          <RefreshCw size={13} /> Оновити
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {tickets.map(t => (
          <TicketCard key={t.id} ticket={t} dark={dark} addToast={addToast} onRefresh={fetchTickets} />
        ))}
      </div>
    </div>
  );
};

const Support = ({ dark, addToast }) => {
  const [tab,       setTab]       = useState('list');
  const [submitted, setSubmitted] = useState(false);

  const textColor = dark ? '#edeffd' : '#363949';
  const subColor  = dark ? '#a3bdcc' : '#677483';

  const handleSuccess = () => {
    setSubmitted(true);
    if (addToast) addToast('Звернення надіслано!', 'success');
    setTimeout(() => { setSubmitted(false); setTab('list'); }, 1500);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{
            width: '2.4rem', height: '2.4rem', borderRadius: '0.7rem', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(108,155,207,0.2), rgba(27,156,133,0.2))',
            border: '1px solid rgba(108,155,207,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HeadphonesIcon size={18} color="#6c9bcf" />
          </div>
          <div>
            <h2 style={{ color: textColor, margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Підтримка</h2>
            <p style={{ color: subColor, margin: 0, fontSize: '0.74rem' }}>Тільки питання по роботі сайту</p>
          </div>
        </div>

        <div style={{
          display: 'flex', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(132,139,200,0.1)',
          borderRadius: '0.7rem', padding: '3px', gap: '2px',
        }}>
          {[{ id: 'list', label: 'Мої звернення' }, { id: 'new', label: '+ Нове' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSubmitted(false); }} style={{
              padding: '0.4rem 0.9rem', borderRadius: '0.5rem', border: 'none',
              background: tab === t.id ? (dark ? 'rgba(108,155,207,0.25)' : 'white') : 'transparent',
              color: tab === t.id ? '#6c9bcf' : subColor,
              cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              fontSize: '0.78rem', fontWeight: tab === t.id ? 600 : 400,
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {submitted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.9rem 1.2rem', borderRadius: '0.8rem', marginBottom: '1.2rem',
          background: 'rgba(27,156,133,0.12)', border: '1px solid rgba(27,156,133,0.3)',
          color: '#1B9c85', fontSize: '0.85rem', fontFamily: 'Poppins, sans-serif',
        }}>
          <CheckCircle size={18} /> Звернення надіслано! Переадресовуємо до списку...
        </div>
      )}

      {tab === 'new'
        ? <SubmitForm dark={dark} onSuccess={handleSuccess} addToast={addToast} />
        : <TicketList dark={dark} onNewTicket={() => setTab('new')} addToast={addToast} />
      }

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
};

export default Support;