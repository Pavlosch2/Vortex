import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ResetPassword from './components/ResetPassword';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('vortex_token') || null);
  const [dark, setDark]   = useState(localStorage.getItem('vortex_theme') === 'dark');
  const [resetParams, setResetParams] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('token');
    const authError   = params.get('auth_error');

    if (googleToken) {
      localStorage.setItem('vortex_token', googleToken);
      setToken(googleToken);
      window.history.replaceState({}, '', '/');
    }
    if (authError) {
      window.history.replaceState({}, '', '/');
    }

    const path = window.location.pathname;
    const match = path.match(/^\/reset-password\/([^/]+)\/([^/]+)\/?$/);
    if (match) {
      setResetParams({ uid: match[1], token: match[2] });
    }
  }, []);

  const handleLoginSuccess = (newToken) => setToken(newToken);
  const handleLogout = () => { localStorage.removeItem('vortex_token'); setToken(null); };

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

  if (!token) return <Auth onLoginSuccess={handleLoginSuccess} dark={dark} setDark={setDark} />;
  return <Dashboard onLogout={handleLogout} dark={dark} setDark={setDark} />;
};

export default App;