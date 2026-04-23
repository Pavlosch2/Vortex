import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Loader, X, ExternalLink, ChevronUp } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={16} color="#1B9c85" />,
  error:   <AlertCircle size={16} color="#ff0060" />,
  info:    <Loader     size={16} color="#6c9bcf" style={{ animation: 'spin 1s linear infinite' }} />,
};

const COLORS = {
  success: { bg: 'rgba(27,156,133,0.12)',  border: 'rgba(27,156,133,0.3)',  text: '#1B9c85',  bar: '#1B9c85' },
  error:   { bg: 'rgba(255,0,96,0.1)',     border: 'rgba(255,0,96,0.3)',    text: '#ff0060',  bar: '#ff0060' },
  info:    { bg: 'rgba(108,155,207,0.12)', border: 'rgba(108,155,207,0.3)', text: '#6c9bcf',  bar: '#6c9bcf' },
};

const ProgressBar = ({ getProgress, toastId, color }) => {
  const [pct, setPct] = useState(() => getProgress(toastId) ?? 1);
  const rafRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const p = getProgress(toastId);
      if (p === null) { setPct(0); return; }
      setPct(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getProgress, toastId]);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '0 0 0.8rem 0.8rem', overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', background: color,
        width: `${pct * 100}%`,
        transition: 'width 0.1s linear',
        borderRadius: '0 0 0.8rem 0.8rem',
      }} />
    </div>
  );
};

const CollapsedToast = ({ toast, onRestore }) => {
  const c = COLORS[toast.type] || COLORS.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.45rem 0.8rem', borderRadius: '999px',
      background: 'rgba(24,26,30,0.97)', border: `1px solid ${c.border}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(12px)',
      fontFamily: 'Poppins, sans-serif',
      animation: 'slideIn 0.2s ease',
      cursor: 'pointer',
    }} onClick={() => onRestore(toast.id)}>
      <div style={{ flexShrink: 0 }}>{ICONS[toast.type] || ICONS.info}</div>
      <span style={{ fontSize: '0.72rem', color: '#a3bdcc', whiteSpace: 'nowrap' }}>
        {toast.collapsedLabel || toast.message}
      </span>
      <ChevronUp size={13} color="#6c9bcf" />
    </div>
  );
};

const Toast = ({ toast, onRemove, onCollapse, onRestore, onNavigate, getProgress }) => {
  const c = COLORS[toast.type] || COLORS.info;
  const hasTimer = getProgress(toast.id) !== null;

  const handleX = () => {
    if (toast.collapsible) {
      onCollapse(toast.id);
    } else {
      onRemove(toast.id);
    }
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
      padding: '0.8rem 1rem 1rem',
      borderRadius: '0.8rem', minWidth: '280px', maxWidth: '380px',
      background: 'rgba(24,26,30,0.97)', border: `1px solid ${c.border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(12px)',
      animation: 'slideIn 0.3s ease',
      fontFamily: 'Poppins, sans-serif',
    }}>
      <div style={{ flexShrink: 0, marginTop: '1px' }}>{ICONS[toast.type] || ICONS.info}</div>

      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#edeffd', lineHeight: 1.4 }}>
          {toast.message}
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          {toast.link && toast.linkLabel && (
            <button
              onClick={() => { onNavigate && onNavigate(toast.link); onRemove(toast.id); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: c.text, fontSize: '0.75rem', padding: 0,
                fontFamily: 'Poppins, sans-serif',
                display: 'flex', alignItems: 'center', gap: '3px',
              }}
            >
              <ExternalLink size={11} /> {toast.linkLabel}
            </button>
          )}
          {toast.cancelTaskId && toast.onCancel && (
            <button
              onClick={() => { toast.onCancel(toast.cancelTaskId, toast.id); onRemove(toast.id); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#ff0060', fontSize: '0.75rem', padding: 0,
                fontFamily: 'Poppins, sans-serif',
                display: 'flex', alignItems: 'center', gap: '3px',
              }}
            >
              <X size={11} /> Скасувати
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleX}
        title={toast.collapsible ? 'Згорнути' : 'Закрити'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a3bdcc', padding: 0, flexShrink: 0 }}
      >
        <X size={14} />
      </button>

      {hasTimer && (
        <ProgressBar getProgress={getProgress} toastId={toast.id} color={c.bar} />
      )}
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast, collapseToast, restoreToast, getProgress, onNavigate }) => (
  <div style={{
    position: 'fixed', bottom: '1.5rem', right: '1.5rem',
    zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  }}>
    <style>{`
      @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      @keyframes spin    { to { transform: rotate(360deg); } }
    `}</style>
    {toasts.map(t => (
      <div key={t.id} style={{ pointerEvents: 'all' }}>
        {t.collapsed
          ? <CollapsedToast toast={t} onRestore={restoreToast} />
          : <Toast
              toast={t}
              onRemove={removeToast}
              onCollapse={collapseToast}
              onRestore={restoreToast}
              onNavigate={onNavigate}
              getProgress={getProgress}
            />
        }
      </div>
    ))}
  </div>
);

export default ToastContainer;