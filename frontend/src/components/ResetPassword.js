import React, { useState } from 'react';
import axios from 'axios';

const API = "http://${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api";

const ResetPassword = ({ uid, token, onDone }) => {
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [status,    setStatus]    = useState(null);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Пароль має бути не менше 8 символів.'); return; }
    if (password !== password2) { setError('Паролі не співпадають.'); return; }
    setError(''); setStatus('saving');
    try {
      await axios.post(`${API}/auth/password-reset-confirm/`, { uid, token, password });
      setStatus('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Посилання недійсне або прострочене.');
      setStatus(null);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem', borderRadius: '0.7rem',
    border: '1.5px solid rgba(108,155,207,0.3)',
    background: 'rgba(255,255,255,0.05)', color: '#edeffd',
    fontSize: '0.95rem', fontFamily: 'Poppins, sans-serif',
    outline: 'none', boxSizing: 'border-box', marginTop: '0.4rem',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0f1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Poppins, sans-serif', padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#181a1e', borderRadius: '1.5rem',
        border: '1px solid rgba(108,155,207,0.15)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#6c9bcf,#1B9c85)', padding: '1.8rem 2rem', textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
            Vortex<span style={{ color: '#ff0060' }}>Pro</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', margin: '6px 0 0' }}>
            Встановити новий пароль
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '2rem' }}>
          {status === 'done' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ color: '#edeffd', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Пароль змінено!</h2>
              <p style={{ color: '#a3bdcc', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Тепер можете увійти з новим паролем.
              </p>
              <button onClick={onDone} style={{
                width: '100%', padding: '0.85rem',
                background: 'linear-gradient(135deg,#6c9bcf,#1B9c85)',
                color: '#fff', border: 'none', borderRadius: '0.7rem',
                fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
              }}>
                Перейти до входу
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ color: '#a3bdcc', fontSize: '0.8rem' }}>Новий пароль</label>
                <input type="password" required style={inputStyle} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Мінімум 8 символів" />
              </div>
              <div>
                <label style={{ color: '#a3bdcc', fontSize: '0.8rem' }}>Повторіть пароль</label>
                <input type="password" required style={inputStyle} value={password2}
                  onChange={e => setPassword2(e.target.value)} placeholder="Введіть ще раз" />
              </div>

              {error && (
                <p style={{ color: '#ff0060', fontSize: '0.8rem', margin: 0 }}>⚠ {error}</p>
              )}

              <button type="submit" disabled={status === 'saving'} style={{
                padding: '0.85rem',
                background: status === 'saving' ? 'rgba(108,155,207,0.4)' : 'linear-gradient(135deg,#6c9bcf,#1B9c85)',
                color: '#fff', border: 'none', borderRadius: '0.7rem',
                fontSize: '0.95rem', fontWeight: 600, cursor: status === 'saving' ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins, sans-serif', marginTop: '0.3rem',
              }}>
                {status === 'saving' ? 'Збереження...' : 'Встановити пароль'}
              </button>

              <button type="button" onClick={onDone} style={{
                background: 'none', border: 'none', color: '#677483',
                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                textAlign: 'center',
              }}>
                Скасувати — повернутись до входу
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;