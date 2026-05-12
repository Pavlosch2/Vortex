import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ResetPassword from './components/ResetPassword';
import ConfirmEmail from './components/ConfirmEmail';
import BlockedScreen from './components/BlockedScreen';

const API = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api`;
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('vortex_token') || null);
  const [dark, setDark] = useState(true);
  const [resetParams, setResetParams] = useState(null);
  const [confirmParams, setConfirmParams] = useState(null);
  const [blockInfo, setBlockInfo] = useState(null);
  const [blockChecked, setBlockChecked] = useState(false);
  const [tfaVerifying, setTfaVerifying] = useState(false);
  const [tfaError, setTfaError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('token');
    const authError = params.get('auth_error');
    const tfaToken = params.get('tfa_token');

    if (tfaToken) {
      window.history.replaceState({}, '', '/');
      setTfaVerifying(true);
      axios.post(`${API}/auth/2fa/verify/`, { token: tfaToken })
        .then(res => {
          const t = res.data.access_token || res.data.access;
          localStorage.setItem('vortex_token', t);
          setToken(t);
        })
        .catch(() => setTfaError('Посилання недійсне або застаріло. Увійдіть знову.'))
        .finally(() => setTfaVerifying(false));
      return;
    }

    if (googleToken) {
      localStorage.setItem('vortex_token', googleToken);
      setToken(googleToken);
      window.history.replaceState({}, '', '/');
    }
    if (authError) {
      window.history.replaceState({}, '', '/');
    }

    const path = window.location.pathname;

    const resetMatch = path.match(/^\/reset-password\/([^/]+)\/([^/]+)\/?$/);
    if (resetMatch) {
      setResetParams({ uid: resetMatch[1], token: resetMatch[2] });
      return;
    }

    const confirmMatch = path.match(/^\/confirm-email\/([^/]+)\/([^/]+)\/?$/);
    if (confirmMatch) {
      setConfirmParams({ uid: confirmMatch[1], token: confirmMatch[2] });
      return;
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setBlockChecked(true);
      setBlockInfo(null);
      return;
    }
    axios.get(`${API}/block-status/`, { headers: auth() })
      .then(res => {
        if (res.data.blocked) setBlockInfo(res.data);
        else setBlockInfo(null);
      })
      .catch(() => setBlockInfo(null))
      .finally(() => setBlockChecked(true));
  }, [token]);

  const handleLoginSuccess = (newToken) => setToken(newToken);
  const handleLogout = () => {
    localStorage.removeItem('vortex_token');
    setToken(null);
    setBlockInfo(null);
  };

  if (resetParams) {
    return (
      <ResetPassword
        uid={resetParams.uid}
        token={resetParams.token}
        onDone={() => {
          setResetParams(null);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  if (confirmParams) {
    return (
      <ConfirmEmail
        uid={confirmParams.uid}
        token={confirmParams.token}
        onDone={() => {
          setConfirmParams(null);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  if (tfaVerifying) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#edeffd' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔐</div>
        <p style={{ color: '#a3bdcc', fontSize: '0.9rem' }}>Перевірка посилання...</p>
      </div>
    </div>
  );

  if (tfaError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#edeffd', maxWidth: '380px', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
        <p style={{ marginBottom: '1rem', color: '#a3bdcc', fontSize: '0.85rem' }}>{tfaError}</p>
        <button onClick={() => setTfaError(null)}
          style={{ padding: '0.65rem 1.8rem', background: 'linear-gradient(135deg,#6c9bcf,#1B9c85)', color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
          На головну
        </button>
      </div>
    </div>
  );

  if (!token) return <Auth onLoginSuccess={handleLoginSuccess} dark={dark} setDark={setDark} />;

  if (!blockChecked) return null;

  if (blockInfo) {
    return (
      <BlockedScreen
        blockInfo={blockInfo}
        onUnblocked={() => setBlockInfo(null)}
      />
    );
  }

  return <Dashboard onLogout={handleLogout} dark={dark} setDark={setDark} />;
};

export default App;