import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';
import logo from '../assets/vortexLogo.png';

const API = 'http://127.0.0.1:8000/api';

const Auth = ({ onLoginSuccess, dark, setDark }) => {
  const [view, setView] = useState('login');

  const [loginData, setLoginData]     = useState({ username: '', password: '' });
  const [regData, setRegData]         = useState({ username: '', email: '', password: '', age: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [errors, setErrors]           = useState({});
  const [info, setInfo]               = useState('');
  const [loginFailed, setLoginFailed] = useState(false);

  const setErr = (field, msg) => setErrors(prev => ({ ...prev, [field]: msg }));
  const clearErrors = () => setErrors({});

  const handleLogin = async (e) => {
    e.preventDefault();
    clearErrors();
    try {
      const res   = await axios.post(`${API}/auth/login/`, loginData);
      const token = res.data.access_token || res.data.access;
      localStorage.setItem('vortex_token', token);
      localStorage.setItem('vortex_theme', dark ? 'dark' : 'light');
      onLoginSuccess(token);
    } catch {
      setErr('login', 'Невірний логін або пароль.');
      setLoginFailed(true);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearErrors();
    const age = parseInt(regData.age);
    if (isNaN(age) || age < 16) { setErr('age', 'Мінімальний вік — 16 років.'); return; }
    if (age > 100)               { setErr('age', 'Вкажіть реальний вік (до 100).'); return; }
    try {
      await axios.post(`${API}/auth/register/`, {
        username: regData.username,
        email:    regData.email,
        password: regData.password,
        age,
      });
      setInfo('Реєстрація успішна! Тепер увійдіть.');
      setView('login');
    } catch (err) {
      const d = err.response?.data || {};
      if (d.username) setErr('regUsername', 'Цей логін вже зайнятий.');
      else if (d.email) setErr('regEmail', d.email[0] || 'Цей email вже використовується.');
      else if (d.age)   setErr('age', d.age[0]);
      else setErr('reg', 'Помилка реєстрації. Спробуйте ще раз.');
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    clearErrors();
    try {
      await axios.post(`${API}/auth/password-reset/`, { email: forgotEmail });
      setView('reset-sent');
    } catch {
      setErr('forgot', 'Сталася помилка. Спробуйте ще раз.');
    }
  };

  const isRegister = view === 'register';

  return (
    <div className={`page-root${dark ? ' dark-mode-variables' : ''}`}>

      <header className="site-header">
        <div className="header-logo">
          <img src={logo} alt="Vortex" className="header-logo-img" />
          <span className="header-logo-text">Vortex</span>
        </div>
        <p className="header-welcome">
          Welcome to the <strong>Vortex system!</strong>
        </p>
        <div className="dark-toggle" onClick={() => setDark(!dark)}>
          <span className={`material-icons-sharp${!dark ? ' active' : ''}`}>light_mode</span>
          <span className={`material-icons-sharp${dark ? ' active' : ''}`}>dark_mode</span>
        </div>
      </header>

      <div className="auth-body">
        <div className={`wrapper ${isRegister ? 'active' : ''}`}>
          <span className="rotate-bg" />
          <span className="rotate-bg2" />

          {/* LOGIN */}
          <div className="form-box login">
            <h2 className="animation" style={{'--i':0,'--j':21}}>Вхід</h2>
            <form onSubmit={handleLogin}>
              {info && <p className="auth-info">{info}</p>}
              {errors.login && <p className="auth-error">{errors.login}</p>}

              <div className="input-box animation" style={{'--i':1,'--j':22}}>
                <input type="text" required value={loginData.username}
                  onChange={e => setLoginData({...loginData, username: e.target.value})} />
                <label>Логін</label>
                <i className="material-icons-sharp" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:18}}>person</i>
              </div>

              <div className="input-box animation" style={{'--i':2,'--j':23}}>
                <input type="password" required value={loginData.password}
                  onChange={e => setLoginData({...loginData, password: e.target.value})} />
                <label>Пароль</label>
                <i className="material-icons-sharp" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:18}}>lock</i>
              </div>

              <button type="submit" className="submit-btn animation" style={{'--i':3,'--j':24}}>
                Увійти
              </button>

              <div className="google-divider animation" style={{'--i':3,'--j':24}}>
                <span>або</span>
              </div>

              <a href="http://127.0.0.1:8000/auth/google/login/"
                className="google-btn animation" style={{'--i':3,'--j':24}}>
                <svg width="18" height="18" viewBox="0 0 48 48" style={{marginRight:'8px',flexShrink:0}}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Увійти через Google
              </a>

              <div className="linkTxt animation" style={{'--i':4,'--j':25}}>
                <p>
                  Немає акаунту?{' '}
                  <span className="link-inline" onClick={() => { clearErrors(); setInfo(''); setView('register'); }}>
                    Зареєструватися
                  </span>
                </p>
                {loginFailed && (
                  <p style={{marginTop: '6px'}}>
                    <span className="link-inline" onClick={() => { clearErrors(); setLoginFailed(false); setView('forgot'); }}>
                      Забули пароль?
                    </span>
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* REGISTER */}
          <div className="form-box register">
            <h2 className="animation" style={{'--i':17,'--j':0}}>Реєстрація</h2>
            <form onSubmit={handleRegister}>
              {errors.reg && <p className="auth-error">{errors.reg}</p>}

              <div className="input-box animation" style={{'--i':18,'--j':1}}>
                <input type="text" required value={regData.username}
                  onChange={e => setRegData({...regData, username: e.target.value})} />
                <label>Логін</label>
                <i className="material-icons-sharp" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:18}}>person</i>
                {errors.regUsername && <p className="auth-error field-error">{errors.regUsername}</p>}
              </div>

              <div className="input-box animation" style={{'--i':18,'--j':1}}>
                <input type="email" required value={regData.email}
                  onChange={e => setRegData({...regData, email: e.target.value})} />
                <label>Email</label>
                <i className="material-icons-sharp" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:18}}>email</i>
                {errors.regEmail && <p className="auth-error field-error">{errors.regEmail}</p>}
              </div>

              <div className="input-box animation" style={{'--i':19,'--j':2}}>
                <input type="number" required min={16} max={100} value={regData.age}
                  onChange={e => setRegData({...regData, age: e.target.value})} />
                <label>Вік (16–100)</label>
                <i className="material-icons-sharp" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:18}}>cake</i>
                {errors.age && <p className="auth-error field-error">{errors.age}</p>}
              </div>

              <div className="input-box animation" style={{'--i':20,'--j':3}}>
                <input type="password" required minLength={8} value={regData.password}
                  onChange={e => setRegData({...regData, password: e.target.value})} />
                <label>Пароль (мін. 8 символів)</label>
                <i className="material-icons-sharp" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:18}}>lock</i>
              </div>

              <button type="submit" className="submit-btn animation" style={{'--i':21,'--j':4}}>
                Створити
              </button>

              <div className="linkTxt animation" style={{'--i':22,'--j':5}}>
                <p>
                  Є акаунт?{' '}
                  <span className="link-inline" onClick={() => { clearErrors(); setView('login'); }}>
                    Увійти
                  </span>
                </p>
              </div>
            </form>
          </div>

          {/* FORGOT PASSWORD overlay */}
          {(view === 'forgot' || view === 'reset-sent') && (
            <div className="auth-overlay">
              {view === 'forgot' ? (
                <>
                  <h2>Відновлення паролю</h2>
                  <p className="overlay-sub">Вкажи свій email — надішлемо посилання для скидання.</p>
                  <form onSubmit={handleForgot} className="overlay-form">
                    <div className="input-box">
                      <input type="email" required value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)} />
                      <label>Email</label>
                      <i className="material-icons-sharp" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:18}}>email</i>
                    </div>
                    {errors.forgot && <p className="auth-error">{errors.forgot}</p>}
                    <button type="submit" className="submit-btn" style={{marginTop:'1.5rem'}}>
                      Надіслати
                    </button>
                    <p className="overlay-back">
                      <span className="link-inline" onClick={() => { clearErrors(); setView('login'); }}>
                        ← Назад до входу
                      </span>
                    </p>
                  </form>
                </>
              ) : (
                <>
                  <h2>Лист надіслано!</h2>
                  <p className="overlay-sub">
                    Перевір свою пошту. Посилання для скидання паролю дійсне 24 години.
                  </p>
                  <p className="overlay-back" style={{marginTop:'1.5rem'}}>
                    <span className="link-inline" onClick={() => { clearErrors(); setView('login'); }}>
                      ← Повернутися до входу
                    </span>
                  </p>
                </>
              )}
            </div>
          )}

          <div className="info-text login">
            <h2 className="animation" style={{'--i':0,'--j':20}}>VORTEX</h2>
            <p className="animation" style={{'--i':1,'--j':21}}>Твій ШІ-асистент.</p>
          </div>
          <div className="info-text register">
            <h2 className="animation" style={{'--i':17,'--j':0}}>JOIN US</h2>
            <p className="animation" style={{'--i':18,'--j':1}}>Долучайся до спільноти.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;