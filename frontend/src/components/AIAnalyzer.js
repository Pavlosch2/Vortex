import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Bot, CheckCircle, AlertTriangle, Zap,
  Clock, ChevronDown, ChevronUp, Loader,
} from 'lucide-react';

const API  = 'http://127.0.0.1:8000/api';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });

// ── Verdict color ──────────────────────────────────────────────────────────────
const verdictStyle = (verdict = '') => {
  const v = verdict.toLowerCase();
  // "частково сумісно" — yellow (check before green to avoid false match)
  if (v.includes('частково'))
    return { color: '#f7d060', bg: 'rgba(247,208,96,0.1)', border: 'rgba(247,208,96,0.3)' };
  // "сумісно" (without "не") — green
  if (v.includes('сумісно') && !v.includes('не сумісно'))
    return { color: '#1B9c85', bg: 'rgba(27,156,133,0.1)', border: 'rgba(27,156,133,0.3)' };
  // "не сумісно" and anything else — red
  return { color: '#ff0060', bg: 'rgba(255,0,96,0.1)', border: 'rgba(255,0,96,0.3)' };
};

// ── Single result card ─────────────────────────────────────────────────────────
const ResultCard = ({ result, buildTitle, dark }) => {
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor  = dark ? '#a3bdcc' : '#677483';
  const vs        = verdictStyle(result.verdict);

  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
      border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.2)',
      borderRadius: '1.2rem', overflow: 'hidden',
      boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(132,139,200,0.12)',
      fontFamily: 'Poppins, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.2rem 1.5rem',
        background: `linear-gradient(135deg, ${vs.bg}, transparent)`,
        borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(132,139,200,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.4rem' }}>
          <Bot size={20} color="#6c9bcf" />
          <span style={{ fontWeight: 700, fontSize: '1rem', color: textColor }}>{buildTitle || 'Аналіз збірки'}</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 1rem', borderRadius: '999px',
          background: vs.bg, border: `1px solid ${vs.border}`,
        }}>
          <CheckCircle size={14} color={vs.color} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: vs.color }}>
            {result.verdict}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {/* FPS — supports both fps_prediction (new task) and predicted_fps (log history) */}
        {(result.fps_prediction || result.predicted_fps) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.8rem',
            padding: '0.9rem 1.1rem', borderRadius: '0.8rem',
            background: dark ? 'rgba(108,155,207,0.08)' : 'rgba(108,155,207,0.06)',
            border: '1px solid rgba(108,155,207,0.2)',
          }}>
            <Zap size={18} color="#6c9bcf" />
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: subColor }}>Прогноз FPS в Arizona RP</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#6c9bcf' }}>
                {result.fps_prediction || result.predicted_fps}
              </p>
            </div>
          </div>
        )}

        {/* Risks */}
        {result.risks?.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <AlertTriangle size={15} color="#ff0060" />
              <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ff0060' }}>Ризики</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {result.risks.map((r, i) => (
                <li key={i} style={{ fontSize: '0.82rem', color: textColor, lineHeight: 1.5 }}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations?.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <CheckCircle size={15} color="#1B9c85" />
              <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1B9c85' }}>Рекомендації</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {result.recommendations.map((r, i) => (
                <li key={i} style={{ fontSize: '0.82rem', color: textColor, lineHeight: 1.5 }}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ── History item (collapsible) ─────────────────────────────────────────────────
const HistoryItem = ({ log, dark }) => {
  const [open, setOpen] = useState(false);
  const subColor = dark ? '#a3bdcc' : '#677483';
  const textColor = dark ? '#edeffd' : '#363949';
  const vs       = verdictStyle(log.verdict);

  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
      border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(132,139,200,0.18)',
      borderRadius: '0.9rem', overflow: 'hidden',
      fontFamily: 'Poppins, sans-serif',
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.8rem', textAlign: 'left',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: textColor }}>{log.build_title}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: vs.color, background: vs.bg, border: `1px solid ${vs.border}`, padding: '2px 8px', borderRadius: 999 }}>
              {log.verdict}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
            <Clock size={11} color={subColor} />
            <span style={{ fontSize: '0.68rem', color: subColor }}>
              {new Date(log.created_at).toLocaleString('uk-UA')}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#6c9bcf' }}>· {log.predicted_fps}</span>
          </div>
        </div>
        {open ? <ChevronUp size={15} color={subColor} /> : <ChevronDown size={15} color={subColor} />}
      </button>

      {open && (
        <div style={{ borderTop: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(132,139,200,0.12)', padding: '1rem 1.1rem' }}>
          <ResultCard result={log} buildTitle={null} dark={dark} />
        </div>
      )}
    </div>
  );
};

// ── Main AIAnalyzer ────────────────────────────────────────────────────────────
const AIAnalyzer = ({ dark, preloadedResult }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const subColor = dark ? '#a3bdcc' : '#677483';

  useEffect(() => {
    axios.get(`${API}/analysis/`, { headers: auth() })
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // When a new preloadedResult arrives, scroll to top
  const latestBuildTitle = history.find(h => h.build_id === preloadedResult?.build_id)?.build_title;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem', fontFamily: 'Poppins, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Latest result — shown when navigated from toast */}
      {preloadedResult && (
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: subColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>
            Останній результат
          </p>
          <ResultCard result={preloadedResult} buildTitle={latestBuildTitle || 'Збірка'} dark={dark} />
        </div>
      )}

      {/* History */}
      <div>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: subColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>
          Історія аналізів
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader size={22} color="#6c9bcf" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : history.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem',
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(132,139,200,0.06)',
            borderRadius: '1rem', border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(132,139,200,0.15)',
          }}>
            <Bot size={36} color={subColor} style={{ marginBottom: '0.8rem', opacity: 0.4 }} />
            <p style={{ color: subColor, fontSize: '0.85rem', margin: 0 }}>
              Ще немає аналізів. Натисніть 🤖 на картці збірки в каталозі.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {history.map(log => (
              <HistoryItem key={log.id} log={log} dark={dark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalyzer;