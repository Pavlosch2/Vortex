import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './styles/BlockedScreen.css';

const API = 'http://${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });

function formatDate(dateStr) {
  if (!dateStr) return 'Назавжди';
  return new Date(dateStr).toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function BlockedScreen({ blockInfo, onUnblocked }) {
  const [appeal, setAppeal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatClosed, setChatClosed] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!appeal) return;
    loadChat();
    pollRef.current = setInterval(loadChat, 5000);
    return () => clearInterval(pollRef.current);
  }, [appeal]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async () => {
    try {
      const res = await axios.get(`${API}/appeal/`, { headers: auth() });
      setMessages(res.data.messages || []);
      if (res.data.is_closed) {
        setChatClosed(true);
        clearInterval(pollRef.current);
      }
    } catch {}
  };

  const sendMessage = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const res = await axios.post(`${API}/appeal/`, { text: t }, { headers: auth() });
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch {}
    setSending(false);
  };

  const checkUnblocked = async () => {
    try {
      const res = await axios.get(`${API}/block-status/`, { headers: auth() });
      if (!res.data.blocked) onUnblocked();
    } catch {}
  };

  useEffect(() => {
    if (chatClosed) {
      const t = setTimeout(checkUnblocked, 1500);
      return () => clearTimeout(t);
    }
  }, [chatClosed]);

  if (appeal) {
    return (
      <div className="blocked-root">
        <div className="appeal-chat-box">
          <div className="appeal-chat-header">
            <span className="appeal-chat-title">Апеляція</span>
            {chatClosed && (
              <span className="appeal-closed-label">Чат закрито</span>
            )}
          </div>
          <div className="appeal-messages">
            {messages.length === 0 && (
              <p className="appeal-empty">Напишіть своє звернення нижче. Модератор розгляне його якнайшвидше.</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`appeal-msg ${m.is_staff ? 'staff' : 'user'}`}>
                <span className="appeal-msg-author">{m.is_staff ? '🛡 ' : ''}{m.author_name}</span>
                <p className="appeal-msg-text">{m.text}</p>
                <span className="appeal-msg-time">
                  {new Date(m.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {!chatClosed && (
            <div className="appeal-input-row">
              <textarea
                className="appeal-textarea"
                placeholder="Введіть повідомлення..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={2}
              />
              <button className="appeal-send-btn" onClick={sendMessage} disabled={sending || !text.trim()}>
                {sending ? '...' : '➤'}
              </button>
            </div>
          )}
          {chatClosed && (
            <p className="appeal-closed-note">Очікуємо відповідь від модерації...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="blocked-root">
      <div className="blocked-card">
        <div className="blocked-icon">🚫</div>
        <h1 className="blocked-title">Акаунт заблоковано</h1>
        <p className="blocked-sub">
          Ваш акаунт заблоковано у зв'язку з порушенням правил платформи.
        </p>
        <div className="blocked-info">
          <div className="blocked-info-row">
            <span className="blocked-info-label">Причина:</span>
            <span className="blocked-info-value">{blockInfo.reason}</span>
          </div>
          <div className="blocked-info-row">
            <span className="blocked-info-label">Термін блокування:</span>
            <span className="blocked-info-value">
              {blockInfo.is_permanent ? 'Назавжди' : formatDate(blockInfo.blocked_until)}
            </span>
          </div>
        </div>
        <p className="blocked-appeal-hint">
          Якщо ви вважаєте, що блокування було помилковим — ви можете подати апеляцію.
        </p>
        <button className="blocked-appeal-btn" onClick={() => setAppeal(true)}>
          Подати апеляцію
        </button>
        
        <button className="blocked-logout-btn" onClick={() => {
          localStorage.removeItem('vortex_token');
          window.location.reload();}}>Вийти з акаунта
        </button>
      </div>
    </div>
  );
}

