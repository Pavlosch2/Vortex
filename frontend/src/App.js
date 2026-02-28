import React, { useState } from 'react';
import Auth from './components/Auth';
import PCSpecsForm from './components/PCSpecsForm';
import AIAnalyzer from './components/AIAnalyzer';

function App() {
  const [token, setToken] = useState(localStorage.getItem('vortex_token'));

  const handleLogout = () => {
    localStorage.removeItem('vortex_token');
    setToken(null);
  };

  return (
    <div className="App">
      {!token ? (
        <Auth onLoginSuccess={(newToken) => setToken(newToken)} />
      ) : (
        <>
          <header style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
            <h1>Vortex</h1>
            <button onClick={handleLogout}>Вийти</button>
          </header>
          <main>
            <PCSpecsForm />
            <AIAnalyzer buildId={1} />
          </main>
        </>
      )}
    </div>
  );
}

export default App;