import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = "http://${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api";

export default function ConfirmEmail({ uid, token, onDone }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    axios.get(`${API}/auth/confirm-email/${uid}/${token}/`)
      .then(() => setStatus('success'))
      .catch(err => {
        const msg = err.response?.data?.error || '';
        if (msg.includes('вже')) setStatus('already');
        else setStatus('error');
      });
  }, [uid, token]);

  const box = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0f1117', fontFamily: "'Poppins', sans-serif", padding: '1rem',
  };
  const card = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '1.25rem', padding: '2.5rem 2.5rem 2rem', maxWidth: '420px',
    width: '100%', textAlign: 'center', backdropFilter: 'blur(20px)',
  };
  const title = { color: '#edeffd', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.6rem' };
  const sub = { color: '#a3bdcc', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 1.5rem' };
  const btn = {
    display: 'inline-block', padding: '0.65rem 1.8rem',
    background: 'linear-gradient(135deg, #6c9bcf, #1B9c85)',
    color: '#fff', fontFamily: "'Poppins', sans-serif", fontSize: '0.85rem',
    fontWeight: 600, border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
  };

  if (status === 'loading') return (
    <div style={box}>
      <div style={card}>
        <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>⏳</div>
        <h1 style={title}>Перевірка посилання...</h1>
      </div>
    </div>
  );

  if (status === 'success') return (
    <div style={box}>
      <div style={card}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>✅</div>
        <h1 style={title}>Email підтверджено!</h1>
        <p style={sub}>Вашу адресу успішно підтверджено. Тепер ви можете увійти в акаунт.</p>
        <button style={btn} onClick={onDone}>Увійти</button>
      </div>
    </div>
  );

  if (status === 'already') return (
    <div style={box}>
      <div style={card}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>✅</div>
        <h1 style={title}>Вже підтверджено</h1>
        <p style={sub}>Цей email вже було підтверджено раніше. Ви можете увійти в акаунт.</p>
        <button style={btn} onClick={onDone}>Увійти</button>
      </div>
    </div>
  );

  return (
    <div style={box}>
      <div style={card}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>❌</div>
        <h1 style={title}>Посилання недійсне</h1>
        <p style={sub}>Посилання для підтвердження застаріло або вже використано. Зареєструйтесь знову.</p>
        <button style={btn} onClick={onDone}>На головну</button>
      </div>
    </div>
  );
}