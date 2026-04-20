import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import './styles/NotificationPanel.css';

const TYPE_ICONS = {
  post_reply: '💬',
  ticket_reply: '🎫',
  ai_done: '🤖',
  moderation_warning: '⚠️',
  submission_status: '📦',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'щойно';
  if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
  return `${Math.floor(diff / 86400)} д тому`;
}

export default function NotificationPanel({ dark, notifications, unreadCount, markRead, markAllRead, deleteOne, deleteAll, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
        setConfirmClear(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNotificationClick = (n) => {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    setConfirmClear(false);
    if (!n.link_type || !onNavigate) return;
    const p = n.link_params || {};
    switch (n.link_type) {
      case 'build_post_reply':
        onNavigate('catalog', { highlight: { build_id: p.build_id, post_id: p.post_id, reply_id: p.reply_id } });
        break;
      case 'support_ticket':
        onNavigate('support', { highlight: { ticket_id: p.ticket_id } });
        break;
      case 'ai_result':
        onNavigate('ai', {});
        break;
      case 'warning_detail':
        onNavigate('support', { warning: p.warning_text });
        break;
      case 'submission_detail':
        onNavigate('admin', { highlight: { submission_id: p.submission_id } });
        break;
      default:
        break;
    }
  };

  const handleClearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    deleteAll();
    setConfirmClear(false);
  };

  const badgeLabel = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="notif-wrapper" ref={panelRef}>
      <button
        className={`notif-bell-btn ${dark ? 'dark' : 'light'}`}
        onClick={() => { setOpen(v => !v); setConfirmClear(false); }}
        aria-label="Сповіщення"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="notif-badge">{badgeLabel}</span>
        )}
      </button>

      {open && (
        <div className={`notif-panel ${dark ? 'dark' : 'light'}`}>
          <div className="notif-panel-header">
            <span className="notif-panel-title">Сповіщення</span>
            <div className="notif-panel-actions">
              {notifications.length > 0 && unreadCount > 0 && (
                <button className="notif-action-btn" onClick={markAllRead}>
                  Позначити всі як прочитані
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className={`notif-action-btn notif-clear-btn ${confirmClear ? 'confirm' : ''}`}
                  onClick={handleClearAll}
                >
                  {confirmClear ? 'Ви впевнені?' : 'Очистити всі'}
                </button>
              )}
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">У вас поки немає сповіщень</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'unread' : ''} ${dark ? 'dark' : 'light'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  {!n.is_read && <div className="notif-unread-bar" />}
                  <div className="notif-item-icon">{TYPE_ICONS[n.type] || '🔔'}</div>
                  <div className="notif-item-body">
                    <p className="notif-item-text">{n.body}</p>
                    <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                  <button
                    className="notif-delete-btn"
                    onClick={(e) => { e.stopPropagation(); deleteOne(n.id); }}
                    aria-label="Видалити"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}